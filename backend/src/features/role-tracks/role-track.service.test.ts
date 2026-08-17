import { describe, expect, it, vi } from "vitest";

import { DomainValidationError } from "../../shared/domain-errors.js";
import {
  createRoleTracksService,
  type RoleTracksRepository,
} from "./role-track.service.js";

function repository(): RoleTracksRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: "track-id",
      name: "platform",
      createdAt: new Date(0),
    }),
    list: vi.fn(),
  };
}

describe("createRoleTracksService", () => {
  it("normalizes role-track names before persistence", async () => {
    const repo = repository();
    const service = createRoleTracksService(repo);

    await service.create({ name: "  Platform  " });

    expect(repo.create).toHaveBeenCalledWith("platform");
  });

  it("rejects a blank role-track name", async () => {
    const service = createRoleTracksService(repository());

    await expect(service.create({ name: "   " })).rejects.toEqual(
      new DomainValidationError("role track name is required"),
    );
  });
});
