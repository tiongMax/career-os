import { describe, expect, it, vi } from "vitest";

import { DomainConflictError, DomainValidationError } from "../errors.js";
import {
  createApplicationsService,
  validateTransition,
  type Application,
  type ApplicationsRepository,
} from "./application.js";

const id = "00000000-0000-4000-8000-000000000004";
const now = new Date("2026-08-01T00:00:00.000Z");
const application: Application = {
  id,
  companyId: "00000000-0000-4000-8000-000000000001",
  resumeVersionId: null,
  title: "Backend Engineer",
  roleTrack: "backend",
  roleTracks: ["backend"],
  source: null,
  status: "saved",
  location: null,
  employmentType: null,
  jobUrl: null,
  portalAccount: null,
  portalPassword: null,
  appliedAt: null,
  deadlineAt: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};

function repository(current = application): ApplicationsRepository {
  return {
    create: vi.fn().mockResolvedValue(current),
    list: vi.fn().mockResolvedValue([current]),
    listPage: vi
      .fn()
      .mockResolvedValue({ items: [current], total: 1, limit: 25, offset: 0 }),
    get: vi.fn().mockResolvedValue(current),
    update: vi.fn().mockResolvedValue(current),
    updateStatusWithAudit: vi
      .fn()
      .mockResolvedValue({ ...current, status: "applied" }),
    createAudit: vi.fn().mockResolvedValue({
      id,
      entityType: "application",
      entityId: id,
      action: "status_changed",
      oldValue: null,
      newValue: null,
      createdAt: now,
    }),
    listAuditLogs: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("application validation", () => {
  it("matches the Go transition graph", () => {
    expect(() => {
      validateTransition("saved", "applied");
    }).not.toThrow();
    expect(() => {
      validateTransition("kiv", "technical_screen_3");
    }).not.toThrow();
    expect(() => {
      validateTransition("withdrawn", "applied");
    }).toThrow(DomainConflictError);
    expect(() => {
      validateTransition("saved", "onsite");
    }).toThrow(
      new DomainConflictError(
        "invalid application status transition: saved -> onsite",
      ),
    );
  });

  it("validates create title, tracks, and status", async () => {
    const service = createApplicationsService(repository());
    await expect(
      service.create({ company_id: "", title: " ", role_track: "backend" }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    await expect(
      service.create({ company_id: "", title: "Role", role_track: "" }),
    ).rejects.toThrow("application track is required");
    await expect(
      service.create({
        company_id: "",
        title: "Role",
        role_track: "backend",
        status: "unknown",
      }),
    ).rejects.toThrow("invalid application status");
  });

  it("clamps pagination to API limits", async () => {
    const store = repository();
    const service = createApplicationsService(store);
    await service.listPage(999, -2);
    expect(store.listPage).toHaveBeenCalledWith(100, 0);
    await service.listPage(0, 0);
    expect(store.listPage).toHaveBeenLastCalledWith(25, 0);
  });

  it("writes status and date audits with stable timestamp values", async () => {
    const store = repository({ ...application, status: "applied" });
    const service = createApplicationsService(store);
    const received = new Date("2026-08-01T02:03:04.123Z");
    await service.changeStatus(id, {
      status: "online_assessment",
      received_at: received,
    });
    expect(store.updateStatusWithAudit).toHaveBeenCalledWith(
      id,
      "online_assessment",
      {
        entityType: "application",
        entityId: id,
        action: "status_changed",
        oldValue: { status: "applied" },
        newValue: {
          status: "online_assessment",
          received_at: "2026-08-01T02:03:04Z",
        },
      },
    );
  });

  it("rejects invalid status dates before writing", async () => {
    const store = repository({ ...application, status: "applied" });
    const service = createApplicationsService(store);
    await expect(
      service.changeStatus(id, { status: "applied", received_at: now }),
    ).rejects.toThrow("status completion date cannot be before received date");
    expect(store.createAudit).not.toHaveBeenCalled();
  });
});
