import { desc, eq } from "drizzle-orm";

import type { Database } from "../../infrastructure/postgres.js";
import type { Company, CreateCompanyInput, UpdateCompanyInput } from "../../domain/companies/company.js";
import { EntityNotFoundError } from "./errors.js";
import { companies } from "./schema.js";

export class DrizzleCompaniesRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateCompanyInput): Promise<Company> {
    const [company] = await this.database
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
  }

  async list(): Promise<Company[]> {
    return this.database
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt))
      .limit(200);
  }

  async get(id: string): Promise<Company> {
    const [company] = await this.database
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    if (company === undefined) {
      throw new EntityNotFoundError("company");
    }
    return company;
  }

  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    const values: Partial<typeof companies.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name != null) values.name = input.name;
    if (input.website != null) values.website = input.website;
    if (input.industry != null) values.industry = input.industry;
    if (input.location != null) values.location = input.location;
    if (input.notes != null) values.notes = input.notes;

    const [company] = await this.database
      .update(companies)
      .set(values)
      .where(eq(companies.id, id))
      .returning();

    if (company === undefined) {
      throw new EntityNotFoundError("company");
    }
    return company;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.database
      .delete(companies)
      .where(eq(companies.id, id))
      .returning({ id: companies.id });

    if (deleted.length === 0) {
      throw new EntityNotFoundError("company");
    }
  }
}
