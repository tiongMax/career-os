import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AnalysisJob,
  AnalysisJobType,
  AnalysisRepository,
} from "./analysis.service.js";
import type { Database } from "../../database/client.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { analysisJobs } from "../../database/schema.js";
export interface AnalysisPersistence extends AnalysisRepository {
  claim: () => Promise<AnalysisJob | null>;
  complete: (id: string, result: unknown) => Promise<AnalysisJob>;
  fail: (id: string, error: string, maxRetries: number) => Promise<AnalysisJob>;
}
export function createAnalysisRepository(
  database: Database,
): AnalysisPersistence {
  async function get(id: string): Promise<AnalysisJob> {
    const [job] = await database
      .select()
      .from(analysisJobs)
      .where(eq(analysisJobs.id, id))
      .limit(1);
    if (!job) throw new EntityNotFoundError("analysis job");
    return job;
  }
  return {
    async create(
      applicationId: string,
      jobType: AnalysisJobType,
      inputSnapshot,
      key,
    ) {
      const [job] = await database
        .insert(analysisJobs)
        .values({ applicationId, jobType, inputSnapshot, idempotencyKey: key })
        .returning();
      if (!job) throw new Error("analysis job insert returned no row");
      return job;
    },
    list: () =>
      database
        .select()
        .from(analysisJobs)
        .orderBy(desc(analysisJobs.createdAt))
        .limit(100),
    listByApplication: (id) =>
      database
        .select()
        .from(analysisJobs)
        .where(eq(analysisJobs.applicationId, id))
        .orderBy(desc(analysisJobs.createdAt)),
    get,
    async claim() {
      const rows = await database.execute<
        Record<string, unknown> & AnalysisJob
      >(
        sql`WITH next_job AS (SELECT id FROM analysis_jobs WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) UPDATE analysis_jobs aj SET status='processing',started_at=COALESCE(aj.started_at,now()),updated_at=now() FROM next_job WHERE aj.id=next_job.id RETURNING aj.id::text,aj.application_id AS "applicationId",aj.job_type AS "jobType",aj.status,aj.input_snapshot AS "inputSnapshot",aj.result,aj.error_message AS "errorMessage",aj.retry_count AS "retryCount",aj.idempotency_key AS "idempotencyKey",aj.started_at AS "startedAt",aj.completed_at AS "completedAt",aj.created_at AS "createdAt",aj.updated_at AS "updatedAt"`,
      );
      return rows.rows[0] ?? null;
    },
    async complete(id, result) {
      const [job] = await database
        .update(analysisJobs)
        .set({
          status: "completed",
          result,
          errorMessage: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(analysisJobs.id, id), eq(analysisJobs.status, "processing")),
        )
        .returning();
      if (!job) throw new EntityNotFoundError("analysis job");
      return job;
    },
    async fail(id, error, maxRetries) {
      const current = await get(id);
      const retryCount = current.retryCount + 1;
      const [job] = await database
        .update(analysisJobs)
        .set({
          status: retryCount >= maxRetries ? "failed" : "queued",
          errorMessage: error,
          retryCount,
          ...(retryCount >= maxRetries ? { completedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(eq(analysisJobs.id, id), eq(analysisJobs.status, "processing")),
        )
        .returning();
      if (!job) throw new EntityNotFoundError("analysis job");
      return job;
    },
  };
}
