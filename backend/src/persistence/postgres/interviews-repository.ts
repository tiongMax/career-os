import { asc, desc, eq } from "drizzle-orm";

import type { InterviewsRepository } from "../../domain/interviews/interview.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import { interviewRounds } from "./schema.js";

export function createInterviewsRepository(
  database: Database,
): InterviewsRepository {
  return {
    async create(applicationId, input) {
      const [interview] = await database
        .insert(interviewRounds)
        .values({
          applicationId,
          roundType: input.round_type,
          scheduledAt: input.scheduled_at ?? null,
          interviewer: input.interviewer ?? null,
          notes: input.notes ?? null,
          outcome: input.outcome ?? null,
        })
        .returning();
      if (interview === undefined)
        throw new Error("interview insert returned no row");
      return interview;
    },
    listByApplication: (applicationId) =>
      database
        .select()
        .from(interviewRounds)
        .where(eq(interviewRounds.applicationId, applicationId))
        .orderBy(
          asc(interviewRounds.scheduledAt),
          desc(interviewRounds.createdAt),
        ),
    async update(id, input) {
      const values: Partial<typeof interviewRounds.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.round_type != null) values.roundType = input.round_type;
      if (input.scheduled_at != null) values.scheduledAt = input.scheduled_at;
      if (input.interviewer != null) values.interviewer = input.interviewer;
      if (input.notes != null) values.notes = input.notes;
      if (input.outcome != null) values.outcome = input.outcome;
      const [interview] = await database
        .update(interviewRounds)
        .set(values)
        .where(eq(interviewRounds.id, id))
        .returning();
      if (interview === undefined) throw new EntityNotFoundError("interview");
      return interview;
    },
    async delete(id) {
      const deleted = await database
        .delete(interviewRounds)
        .where(eq(interviewRounds.id, id))
        .returning({ id: interviewRounds.id });
      if (deleted.length === 0) throw new EntityNotFoundError("interview");
    },
  };
}
