import { desc, eq } from "drizzle-orm";

import type { Database } from "../../database/client.js";
import type { CompaniesRepository } from "./company.service.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { companies } from "../../database/schema.js";

export function createCompaniesRepository(
  database: Database,
): CompaniesRepository {
  return {
    async create(input) {
      const [company] = await database
        .insert(companies)
        .values({
          name: input.name,
          website: input.website ?? null,
          industry: input.industry ?? null,
          location: input.location ?? null,
          notes: input.notes ?? null,
        })
        .returning();

      if (company === undefined) {
        throw new Error("company insert returned no row");
      }
      return company;
    },

    async list() {
      return database
        .select()
        .from(companies)
        .orderBy(desc(companies.createdAt))
        .limit(200);
    },

    async get(id) {
      const [company] = await database
        .select()
        .from(companies)
        .where(eq(companies.id, id))
        .limit(1);

      if (company === undefined) {
        throw new EntityNotFoundError("company");
      }
      return company;
    },

    async update(id, input) {
      const values: Partial<typeof companies.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.name != null) values.name = input.name;
      if (input.website != null) values.website = input.website;
      if (input.industry != null) values.industry = input.industry;
      if (input.location != null) values.location = input.location;
      if (input.notes != null) values.notes = input.notes;

      const [company] = await database
        .update(companies)
        .set(values)
        .where(eq(companies.id, id))
        .returning();

      if (company === undefined) {
        throw new EntityNotFoundError("company");
      }
      return company;
    },

    async delete(id) {
      const deleted = await database
        .delete(companies)
        .where(eq(companies.id, id))
        .returning({ id: companies.id });

      if (deleted.length === 0) {
        throw new EntityNotFoundError("company");
      }
    },
  };
}
