import { describe, expect, it, vi } from "vitest";

import { DomainValidationError } from "../errors.js";
import {
  DefaultRoleTracksService,
  type RoleTracksRepository,
} from "./role-track.js";

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

describe("DefaultRoleTracksService", () => {
  it("normalizes role-track names before persistence", async () => {
    const repo = repository();
    const service = new DefaultRoleTracksService(repo);

    await service.create({ name: "  Platform  " });

    expect(repo.create).toHaveBeenCalledWith("platform");
  });

  it("rejects a blank role-track name", async () => {
    const service = new DefaultRoleTracksService(repository());

    await expect(service.create({ name: "   " })).rejects.toEqual(
      new DomainValidationError("role track name is required"),
    );
  });
});
