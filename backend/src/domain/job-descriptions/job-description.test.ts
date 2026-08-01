import { describe, expect, it, vi } from "vitest";

import type { ResumeVersion } from "../resumes/resume-version.js";
import {
  createJobDescriptionsService,
  matchKeywords,
  type JobDescription,
  type JobDescriptionsRepository,
  type PrepContext,
} from "./job-description.js";

const now = new Date("2026-08-01T01:02:03.000Z");
const description: JobDescription = {
  id: "description",
  applicationId: "application",
  rawText: "TypeScript, FastAPI, Redis and Kubernetes",
  extractedKeywords: ["TypeScript", "Redis", "Kubernetes"],
  aiSummary: null,
  createdAt: now,
  updatedAt: now,
};
const resume: ResumeVersion = {
  id: "resume",
  name: "Backend resume",
  track: "backend",
  contentText: "Built Redis-backed workers with TypeScript",
  hasPdf: false,
  tags: [],
  createdAt: now,
  updatedAt: now,
};

function repository(
  overrides: Partial<JobDescriptionsRepository> = {},
): JobDescriptionsRepository {
  return {
    create: vi.fn().mockResolvedValue(description),
    getByApplication: vi.fn().mockResolvedValue(description),
    get: vi.fn().mockResolvedValue(description),
    update: vi.fn().mockResolvedValue(description),
    listResumes: vi.fn().mockResolvedValue([resume]),
    getResume: vi.fn().mockResolvedValue(resume),
    getPrepContext: vi.fn(),
    ...overrides,
  };
}

describe("job description service", () => {
  it("rejects blank raw text and normalizes missing keywords", async () => {
    const repo = repository();
    const service = createJobDescriptionsService(repo);
    await expect(
      service.create("application", { raw_text: " " }),
    ).rejects.toThrow("job description raw_text is required");
    await service.create("application", { raw_text: "Backend role" });
    expect(repo.create).toHaveBeenCalledWith("application", {
      raw_text: "Backend role",
      extracted_keywords: [],
    });
  });

  it("extracts canonical skills in dictionary order", async () => {
    const repo = repository();
    await createJobDescriptionsService(repo).extractKeywords(description.id);
    expect(repo.update).toHaveBeenCalledWith(description.id, {
      extracted_keywords: ["TypeScript", "R", "FastAPI", "Redis", "Kubernetes"],
    });
  });

  it("uses weighted resume evidence", () => {
    expect(
      matchKeywords(["Redis", "TypeScript", "Kubernetes"], resume),
    ).toEqual({
      matched: ["Redis", "TypeScript"],
      missing: ["Kubernetes"],
      score: 2 / 3,
      comparedKeywords: 3,
      evidence: [
        { keyword: "Redis", source: "content_text", weight: 1 },
        { keyword: "TypeScript", source: "content_text", weight: 1 },
      ],
    });
  });

  it("builds a deterministic prep brief", async () => {
    const context = {
      application: {
        id: "application",
        companyId: "company",
        resumeVersionId: "resume",
        title: "Platform Engineer",
        roleTrack: "backend",
        roleTracks: ["backend"],
        source: null,
        status: "applied",
        location: "Remote",
        employmentType: "full_time",
        jobUrl: null,
        portalAccount: null,
        portalPassword: null,
        appliedAt: null,
        deadlineAt: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
      company: {
        id: "company",
        name: "Acme",
        website: null,
        industry: null,
        location: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
      jobDescription: description,
      resume,
      interviews: [
        {
          id: "interview",
          applicationId: "application",
          roundType: "system_design",
          scheduledAt: null,
          interviewer: null,
          notes: null,
          outcome: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      contacts: [],
      auditLogs: [],
    } satisfies PrepContext;
    const service = createJobDescriptionsService(
      repository({ getPrepContext: vi.fn().mockResolvedValue(context) }),
      () => now,
    );
    await expect(service.generatePrepBrief("application")).resolves.toEqual({
      roleSummary: "Platform Engineer at Acme (full_time) · Remote",
      keyGaps: ["Kubernetes"],
      focusAreas: ["System design and architecture"],
      talkingPoints: [
        "Demonstrate TypeScript proficiency",
        "Demonstrate Redis proficiency",
      ],
      generatedAt: now,
    });
  });
});
