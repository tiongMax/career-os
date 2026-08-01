import { desc, eq } from "drizzle-orm";

import type { ContactsRepository } from "../../domain/contacts/contact.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import { contacts } from "./schema.js";

export function createContactsRepository(
  database: Database,
): ContactsRepository {
  return {
    async create(input) {
      const [contact] = await database
        .insert(contacts)
        .values({
          companyId: input.company_id,
          name: input.name,
          role: input.role ?? null,
          email: input.email ?? null,
          linkedinUrl: input.linkedin_url ?? null,
          relationship: input.relationship ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      if (contact === undefined)
        throw new Error("contact insert returned no row");
      return contact;
    },
    list: () =>
      database
        .select()
        .from(contacts)
        .orderBy(desc(contacts.createdAt))
        .limit(200),
    async get(id) {
      const [contact] = await database
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
      if (contact === undefined) throw new EntityNotFoundError("contact");
      return contact;
    },
    async update(id, input) {
      const values: Partial<typeof contacts.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.company_id != null) values.companyId = input.company_id;
      if (input.name != null) values.name = input.name;
      if (input.role != null) values.role = input.role;
      if (input.email != null) values.email = input.email;
      if (input.linkedin_url != null) values.linkedinUrl = input.linkedin_url;
      if (input.relationship != null) values.relationship = input.relationship;
      if (input.notes != null) values.notes = input.notes;
      const [contact] = await database
        .update(contacts)
        .set(values)
        .where(eq(contacts.id, id))
        .returning();
      if (contact === undefined) throw new EntityNotFoundError("contact");
      return contact;
    },
    async delete(id) {
      const deleted = await database
        .delete(contacts)
        .where(eq(contacts.id, id))
        .returning({ id: contacts.id });
      if (deleted.length === 0) throw new EntityNotFoundError("contact");
    },
  };
}
