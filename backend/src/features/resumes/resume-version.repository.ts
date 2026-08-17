import { desc, eq, sql } from "drizzle-orm";

import type { ResumeVersionsRepository } from "./resume-version.service.js";
import type { Database } from "../../database/client.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { resumeVersions } from "../../database/schema.js";

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

export function createResumeVersionsRepository(
  database: Database,
): ResumeVersionsRepository {
  return {
    async create(input) {
      const [resume] = await database
        .insert(resumeVersions)
        .values({
          name: input.name,
          track: input.track,
          contentText: input.content_text ?? null,
          tags: input.tags,
        })
        .returning(resumeSelection);

      if (resume === undefined)
        throw new Error("resume version insert returned no row");
      return resume;
    },

    async list() {
      return database
        .select(resumeSelection)
        .from(resumeVersions)
        .orderBy(desc(resumeVersions.createdAt))
        .limit(200);
    },

    async get(id) {
      const [resume] = await database
        .select(resumeSelection)
        .from(resumeVersions)
        .where(eq(resumeVersions.id, id))
        .limit(1);

      if (resume === undefined) throw new EntityNotFoundError("resume version");
      return resume;
    },

    async update(id, input) {
      const values: Partial<typeof resumeVersions.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name != null) values.name = input.name;
      if (input.track != null) values.track = input.track;
      if (input.content_text != null) values.contentText = input.content_text;
      if (input.tags != null) values.tags = input.tags;

      const [resume] = await database
        .update(resumeVersions)
        .set(values)
        .where(eq(resumeVersions.id, id))
        .returning(resumeSelection);

      if (resume === undefined) throw new EntityNotFoundError("resume version");
      return resume;
    },

    async delete(id) {
      const deleted = await database
        .delete(resumeVersions)
        .where(eq(resumeVersions.id, id))
        .returning({ id: resumeVersions.id });
      if (deleted.length === 0) throw new EntityNotFoundError("resume version");
    },

    async storePdf(id, data) {
      await database
        .update(resumeVersions)
        .set({ pdfData: data, updatedAt: new Date() })
        .where(eq(resumeVersions.id, id));
    },

    async getPdf(id) {
      const [resume] = await database
        .select({ pdfData: resumeVersions.pdfData })
        .from(resumeVersions)
        .where(eq(resumeVersions.id, id))
        .limit(1);
      if (resume === undefined) throw new EntityNotFoundError("resume version");
      return resume.pdfData;
    },
  };
}
