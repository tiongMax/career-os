import { desc, eq } from "drizzle-orm";

import type { JobDescriptionsRepository } from "./job-description.service.js";
import type { Database } from "../../database/client.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { jobDescriptions } from "../../database/schema.js";

const descriptionSelection = {
  id: jobDescriptions.id,
  applicationId: jobDescriptions.applicationId,
  rawText: jobDescriptions.rawText,
  createdAt: jobDescriptions.createdAt,
  updatedAt: jobDescriptions.updatedAt,
};

export function createJobDescriptionsRepository(
  database: Database,
): JobDescriptionsRepository {
  return {
    async create(applicationId, input) {
      const [description] = await database
        .insert(jobDescriptions)
        .values({ applicationId, rawText: input.raw_text })
        .returning(descriptionSelection);
      if (description === undefined)
        throw new Error("job description insert returned no row");
      return description;
    },
    async getByApplication(applicationId) {
      const [description] = await database
        .select(descriptionSelection)
        .from(jobDescriptions)
        .where(eq(jobDescriptions.applicationId, applicationId))
        .orderBy(desc(jobDescriptions.createdAt))
        .limit(1);
      if (description === undefined)
        throw new EntityNotFoundError("job description");
      return description;
    },
    async update(id, input) {
      const values: Partial<typeof jobDescriptions.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.raw_text != null) values.rawText = input.raw_text;
      const [description] = await database
        .update(jobDescriptions)
        .set(values)
        .where(eq(jobDescriptions.id, id))
        .returning(descriptionSelection);
      if (description === undefined)
        throw new EntityNotFoundError("job description");
      return description;
    },
  };
}
