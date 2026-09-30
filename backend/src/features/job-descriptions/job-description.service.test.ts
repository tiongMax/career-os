import { describe, expect, it, vi } from "vitest";

import {
  createJobDescriptionsService,
  type JobDescription,
  type JobDescriptionsRepository,
} from "./job-description.service.js";

const now = new Date("2026-08-01T01:02:03.000Z");
const description: JobDescription = {
  id: "description",
  applicationId: "application",
  rawText: "Backend role",
  createdAt: now,
  updatedAt: now,
};
function repository(): JobDescriptionsRepository {
  return {
    create: vi.fn().mockResolvedValue(description),
    getByApplication: vi.fn().mockResolvedValue(description),
    update: vi.fn().mockResolvedValue(description),
  };
}
describe("job description service", () => {
  it("creates and retrieves saved job description text", async () => {
    const repo = repository();
    const service = createJobDescriptionsService(repo);
    await expect(
      service.create("application", { raw_text: "Backend role" }),
    ).resolves.toEqual(description);
    await expect(service.getByApplication("application")).resolves.toEqual(
      description,
    );
    expect(repo.create).toHaveBeenCalledWith("application", {
      raw_text: "Backend role",
    });
  });
  it("rejects blank text before creating or updating", async () => {
    const repo = repository();
    const service = createJobDescriptionsService(repo);
    await expect(
      service.create("application", { raw_text: " " }),
    ).rejects.toThrow("job description raw_text is required");
    await expect(
      service.update("description", { raw_text: "\n" }),
    ).rejects.toThrow("job description raw_text is required");
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
  it("updates text and preserves existing null patch semantics", async () => {
    const repo = repository();
    const service = createJobDescriptionsService(repo);
    await service.update("description", { raw_text: "Updated role" });
    await service.update("description", { raw_text: null });
    expect(repo.update).toHaveBeenNthCalledWith(1, "description", {
      raw_text: "Updated role",
    });
    expect(repo.update).toHaveBeenNthCalledWith(2, "description", {
      raw_text: null,
    });
  });
  it("propagates persistence failures", async () => {
    const repo = repository();
    vi.mocked(repo.update).mockRejectedValue(new Error("database unavailable"));
    await expect(
      createJobDescriptionsService(repo).update("description", {
        raw_text: "Updated role",
      }),
    ).rejects.toThrow("database unavailable");
  });
});
