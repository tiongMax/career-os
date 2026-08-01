import { describe, expect, it, vi } from "vitest";

import { DomainValidationError } from "../errors.js";
import {
  createResumeVersionsService,
  type ResumeVersion,
  type ResumeVersionsRepository,
} from "./resume-version.js";

const now = new Date("2026-08-01T00:00:00.000Z");
const resume: ResumeVersion = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Backend v1",
  track: "backend",
  contentText: null,
  hasPdf: false,
  tags: [],
  createdAt: now,
  updatedAt: now,
};

function fakeRepository(): ResumeVersionsRepository {
  return {
    create: vi.fn().mockResolvedValue(resume),
    list: vi.fn().mockResolvedValue([resume]),
    get: vi.fn().mockResolvedValue(resume),
    update: vi.fn().mockResolvedValue(resume),
    delete: vi.fn().mockResolvedValue(undefined),
    storePdf: vi.fn().mockResolvedValue(undefined),
    getPdf: vi.fn().mockResolvedValue(null),
  };
}

describe("createResumeVersionsService", () => {
  it("requires a non-blank name", async () => {
    const service = createResumeVersionsService(fakeRepository());
    await expect(
      service.create({ name: " ", track: "backend" }),
    ).rejects.toEqual(
      new DomainValidationError("resume version name is required"),
    );
  });

  it("requires one of the four Go-compatible tracks", async () => {
    const service = createResumeVersionsService(fakeRepository());
    await expect(
      service.create({ name: "Mobile", track: "mobile" }),
    ).rejects.toEqual(
      new DomainValidationError(
        "resume track must be one of backend, ai, quant, general",
      ),
    );
  });

  it("defaults omitted and null tags to an empty array", async () => {
    const repository = fakeRepository();
    const service = createResumeVersionsService(repository);

    await service.create({ name: "Backend", track: "backend", tags: null });

    expect(repository.create).toHaveBeenCalledWith({
      name: "Backend",
      track: "backend",
      tags: [],
    });
  });

  it("validates only non-null patch values", async () => {
    const repository = fakeRepository();
    const service = createResumeVersionsService(repository);

    await service.update(resume.id, {
      name: null,
      track: null,
      content_text: "Updated resume text",
      tags: null,
    });

    expect(repository.update).toHaveBeenCalledWith(resume.id, {
      name: null,
      track: null,
      content_text: "Updated resume text",
      tags: null,
    });
  });
});
