import { describe, expect, it, vi } from "vitest";
import type { AnalysisJob } from "./analysis.service.js";
import { createAnalysisProcessor } from "./analysis.worker.js";
const now = new Date("2026-08-02T01:00:00Z");
const job: AnalysisJob = {
  id: "j",
  applicationId: "a",
  jobType: "prep_brief",
  status: "processing",
  inputSnapshot: {},
  result: null,
  errorMessage: null,
  retryCount: 0,
  idempotencyKey: "k",
  startedAt: now,
  completedAt: null,
  createdAt: now,
  updatedAt: now,
};
describe("analysis processor", () => {
  it("completes a claimed job with normalized result", async () => {
    const complete = vi.fn().mockResolvedValue({ ...job, status: "completed" });
    const store = {
      claim: vi.fn().mockResolvedValue(job),
      complete,
      fail: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
      listByApplication: vi.fn(),
      get: vi.fn(),
    };
    const provider = {
      analyze: vi.fn().mockResolvedValue({
        summary: "Ready",
        match_score: 0,
        matched_skills: [],
        missing_skills: [],
        resume_feedback: [],
        interview_focus: [],
      }),
    };
    await createAnalysisProcessor({
      store,
      provider,
      buildInput: vi.fn().mockResolvedValue({ application: { id: "a" } }),
      maxRetries: 3,
      pollIntervalMs: 1,
      now: () => now,
    }).processNext();
    expect(complete).toHaveBeenCalledWith(
      "j",
      expect.objectContaining({
        summary: "Ready",
        generated_at: now.toISOString(),
      }),
    );
  });
  it("requeues provider failures through persistence", async () => {
    const fail = vi
      .fn()
      .mockResolvedValue({ ...job, status: "queued", retryCount: 1 });
    const store = {
      claim: vi.fn().mockResolvedValue(job),
      complete: vi.fn(),
      fail,
      create: vi.fn(),
      list: vi.fn(),
      listByApplication: vi.fn(),
      get: vi.fn(),
    };
    await createAnalysisProcessor({
      store,
      provider: {
        analyze: vi.fn().mockRejectedValue(new Error("provider down")),
      },
      buildInput: vi.fn().mockResolvedValue({}),
      maxRetries: 3,
      pollIntervalMs: 1,
    }).processNext();
    expect(fail).toHaveBeenCalledWith("j", "provider down", 3);
  });

  it("persists JD extraction results", async () => {
    const extractionJob = { ...job, jobType: "jd_extract" };
    const description = {
      id: "jd",
      applicationId: "a",
      rawText: "TypeScript PostgreSQL",
      extractedKeywords: [],
      aiSummary: null,
      createdAt: now,
      updatedAt: now,
    };
    const persistJobDescriptionExtraction = vi.fn();
    const store = {
      claim: vi.fn().mockResolvedValueOnce(extractionJob),
      complete: vi.fn().mockResolvedValue({
        ...extractionJob,
        status: "completed",
      }),
      fail: vi.fn(),
      create: vi.fn(),
      list: vi.fn(),
      listByApplication: vi.fn(),
      get: vi.fn(),
    };
    const result = {
      summary: "Backend role",
      match_score: 0,
      matched_skills: [],
      missing_skills: [],
      extracted_keywords: ["TypeScript", "PostgreSQL"],
      resume_feedback: [],
      interview_focus: [],
    };
    await createAnalysisProcessor({
      store,
      provider: { analyze: vi.fn().mockResolvedValue(result) },
      buildInput: vi.fn().mockResolvedValue({
        job: extractionJob,
        application: {},
        company: {},
        job_description: description,
        resume: null,
        resume_versions: [],
      }),
      persistJobDescriptionExtraction,
      maxRetries: 3,
      pollIntervalMs: 1,
    }).processNext();
    expect(persistJobDescriptionExtraction).toHaveBeenCalledWith(
      description,
      result,
    );
  });

  it("ranks resume-match candidates with embeddings", async () => {
    const resumeJob = { ...job, jobType: "resume_match" };
    const complete = vi.fn().mockResolvedValue({
      ...resumeJob,
      status: "completed",
    });
    const analyze = vi.fn().mockResolvedValue({
      summary: "Strong fit",
      match_score: 0,
      matched_skills: [],
      missing_skills: [],
      resume_feedback: [],
      interview_focus: [],
    });
    const embed = vi.fn((text: string) =>
      Promise.resolve(text.includes("frontend") ? [0, 1] : [1, 0]),
    );
    await createAnalysisProcessor({
      store: {
        claim: vi.fn().mockResolvedValue(resumeJob),
        complete,
        fail: vi.fn(),
        create: vi.fn(),
        list: vi.fn(),
        listByApplication: vi.fn(),
        get: vi.fn(),
      },
      provider: { analyze, embed },
      buildInput: vi.fn().mockResolvedValue({
        job: resumeJob,
        application: {},
        company: {},
        job_description: {
          id: "jd",
          applicationId: "a",
          rawText: "backend",
          extractedKeywords: [],
          aiSummary: null,
          createdAt: now,
          updatedAt: now,
        },
        resume: null,
        resume_versions: [
          {
            id: "frontend",
            name: "frontend",
            track: "general",
            contentText: null,
            hasPdf: false,
            tags: [],
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "backend",
            name: "backend",
            track: "backend",
            contentText: null,
            hasPdf: false,
            tags: [],
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
      maxRetries: 3,
      pollIntervalMs: 1,
    }).processNext();
    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        embedding_matches: [
          expect.objectContaining({ resume_version_id: "backend" }),
        ],
      }),
    );
    expect(complete).toHaveBeenCalledWith(
      "j",
      expect.objectContaining({
        recommended_resume_id: "backend",
        match_score: 1,
      }),
    );
  });
});
