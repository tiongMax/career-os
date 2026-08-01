import { desc, eq, sql } from "drizzle-orm";

import type {
  CreateResumeVersionInput,
  ResumeVersion,
  ResumeVersionsRepository,
  UpdateResumeVersionInput,
} from "../../domain/resumes/resume-version.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import { resumeVersions } from "./schema.js";

const resumeSelection = {
  id: resumeVersions.id,
  name: resumeVersions.name,
  track: resumeVersions.track,
  contentText: resumeVersions.contentText,
  hasPdf: sql<boolean>`${resumeVersions.pdfData} IS NOT NULL`,
  tags: resumeVersions.tags,
  createdAt: resumeVersions.createdAt,
  updatedAt: resumeVersions.updatedAt,
};

export class DrizzleResumeVersionsRepository implements ResumeVersionsRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateResumeVersionInput & { tags: string[] }): Promise<ResumeVersion> {
    const [resume] = await this.database
      .insert(resumeVersions)
      .values({
        name: input.name,
        track: input.track,
        contentText: input.content_text ?? null,
        tags: input.tags,
      })
      .returning(resumeSelection);

    if (resume === undefined) throw new Error("resume version insert returned no row");
    return resume;
  }

  async list(): Promise<ResumeVersion[]> {
    return this.database
      .select(resumeSelection)
      .from(resumeVersions)
      .orderBy(desc(resumeVersions.createdAt))
      .limit(200);
  }

  async get(id: string): Promise<ResumeVersion> {
    const [resume] = await this.database
      .select(resumeSelection)
      .from(resumeVersions)
      .where(eq(resumeVersions.id, id))
      .limit(1);

    if (resume === undefined) throw new EntityNotFoundError("resume version");
    return resume;
  }

  async update(id: string, input: UpdateResumeVersionInput): Promise<ResumeVersion> {
    const values: Partial<typeof resumeVersions.$inferInsert> = { updatedAt: new Date() };
    if (input.name != null) values.name = input.name;
    if (input.track != null) values.track = input.track;
    if (input.content_text != null) values.contentText = input.content_text;
    if (input.tags != null) values.tags = input.tags;

    const [resume] = await this.database
      .update(resumeVersions)
      .set(values)
      .where(eq(resumeVersions.id, id))
      .returning(resumeSelection);

    if (resume === undefined) throw new EntityNotFoundError("resume version");
    return resume;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.database
      .delete(resumeVersions)
      .where(eq(resumeVersions.id, id))
      .returning({ id: resumeVersions.id });
    if (deleted.length === 0) throw new EntityNotFoundError("resume version");
  }

  async storePdf(id: string, data: Buffer): Promise<void> {
    await this.database
      .update(resumeVersions)
      .set({ pdfData: data, updatedAt: new Date() })
      .where(eq(resumeVersions.id, id));
  }

  async getPdf(id: string): Promise<Buffer | null> {
    const [resume] = await this.database
      .select({ pdfData: resumeVersions.pdfData })
      .from(resumeVersions)
      .where(eq(resumeVersions.id, id))
      .limit(1);
    if (resume === undefined) throw new EntityNotFoundError("resume version");
    return resume.pdfData;
  }
}
