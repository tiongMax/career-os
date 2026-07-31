import { z } from "zod";

import { DomainValidationError } from "../errors.js";

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createCompanyInputSchema = z.strictObject({
  name: z.string().default(""),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateCompanyInputSchema = z.strictObject({
  name: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanyInputSchema>;

export interface CompaniesRepository {
  create: (input: CreateCompanyInput) => Promise<Company>;
  list: () => Promise<Company[]>;
  get: (id: string) => Promise<Company>;
  update: (id: string, input: UpdateCompanyInput) => Promise<Company>;
  delete: (id: string) => Promise<void>;
}

export interface CompaniesService {
  create: (input: CreateCompanyInput) => Promise<Company>;
  list: () => Promise<Company[]>;
  get: (id: string) => Promise<Company>;
  update: (id: string, input: UpdateCompanyInput) => Promise<Company>;
  delete: (id: string) => Promise<void>;
}

export class DefaultCompaniesService implements CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  async create(input: CreateCompanyInput): Promise<Company> {
    requireCompanyName(input.name);
    return this.repository.create(input);
  }

  async list(): Promise<Company[]> {
    return this.repository.list();
  }

  async get(id: string): Promise<Company> {
    return this.repository.get(id);
  }

  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    if (input.name != null) {
      requireCompanyName(input.name);
    }
    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

function requireCompanyName(name: string): void {
  if (name.trim() === "") {
    throw new DomainValidationError("company name is required");
  }
}
