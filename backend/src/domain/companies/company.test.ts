import { describe, expect, it, vi } from "vitest";

import { DomainValidationError } from "../errors.js";
import { createCompaniesService, type CompaniesRepository } from "./company.js";

function repository(): CompaniesRepository {
  return {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

describe("createCompaniesService", () => {
  it("rejects a blank company name on create", async () => {
    const service = createCompaniesService(repository());

    await expect(service.create({ name: "   " })).rejects.toEqual(
      new DomainValidationError("company name is required"),
    );
  });

  it("rejects a blank company name on update", async () => {
    const service = createCompaniesService(repository());

    await expect(service.update("company-id", { name: "" })).rejects.toEqual(
      new DomainValidationError("company name is required"),
    );
  });

  it("allows an update that omits the company name", async () => {
    const repo = repository();
    vi.mocked(repo.update).mockResolvedValue({
      id: "company-id",
      name: "Acme",
      website: null,
      industry: "Software",
      location: null,
      notes: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    const service = createCompaniesService(repo);

    await service.update("company-id", { industry: "Software" });

    expect(repo.update).toHaveBeenCalledWith("company-id", {
      industry: "Software",
    });
  });
});
