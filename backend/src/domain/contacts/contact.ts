import { z } from "zod";

import { DomainValidationError } from "../errors.js";

const nullableString = z.string().nullable().optional();

export const createContactInputSchema = z.strictObject({
  company_id: z.string().default(""),
  name: z.string().default(""),
  role: nullableString,
  email: nullableString,
  linkedin_url: nullableString,
  relationship: nullableString,
  notes: nullableString,
});

export const updateContactInputSchema = z.strictObject({
  company_id: nullableString,
  name: nullableString,
  role: nullableString,
  email: nullableString,
  linkedin_url: nullableString,
  relationship: nullableString,
  notes: nullableString,
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  relationship: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactsRepository {
  create: (input: CreateContactInput) => Promise<Contact>;
  list: () => Promise<Contact[]>;
  get: (id: string) => Promise<Contact>;
  update: (id: string, input: UpdateContactInput) => Promise<Contact>;
  delete: (id: string) => Promise<void>;
}

export type ContactsService = ContactsRepository;

export function createContactsService(
  repository: ContactsRepository,
): ContactsService {
  return {
    async create(input) {
      requireName(input.name);
      return repository.create(input);
    },
    list: () => repository.list(),
    get: (id) => repository.get(id),
    async update(id, input) {
      if (input.name != null) requireName(input.name);
      return repository.update(id, input);
    },
    delete: (id) => repository.delete(id),
  };
}

function requireName(name: string): void {
  if (name.trim() === "")
    throw new DomainValidationError("contact name is required");
}
