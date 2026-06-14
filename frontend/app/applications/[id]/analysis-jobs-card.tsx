"use client";

import { Activity, Brain, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAnalysisJob,
  type AnalysisJob,
  type AnalysisJobType,
  type AnalysisResult,
} from "@/lib/api";
import { formatRelative } from "@/lib/utils";

const jobTypes: Array<{ type: AnalysisJobType; label: string }> = [
  { type: "resume_match", label: "Resume Match" },
  { type: "jd_extract", label: "JD Extract" },
  { type: "prep_brief", label: "Prep Brief" },
];

export function AnalysisJobsCard({
  applicationId,
  initialJobs,
}: {
  applicationId: string;
  initialJobs: AnalysisJob[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [pendingType, setPendingType] = useState<AnalysisJobType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  async function queueJob(jobType: AnalysisJobType) {
    setPendingType(jobType);
    setError(null);
    try {
      const job = await createAnalysisJob(applicationId, jobType);
      setJobs((current) => [job, ...current]);
      startRefresh(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to queue analysis job");
    } finally {
      setPendingType(null);
    }
  }

  function refresh() {
    startRefresh(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {jobTypes.map((job) => (
            <button
              key={job.type}
              onClick={() => queueJob(job.type)}
              disabled={pendingType !== null || isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
              title={`Queue ${job.label}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {pendingType === job.type ? "Queueing..." : job.label}
            </button>
          ))}
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 sm:self-auto"
          title="Refresh jobs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {jobs.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-400">
          <Brain className="h-4 w-4" />
          No analysis jobs queued yet
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-md border border-neutral-100 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{formatJobType(job.job_type)}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {formatRelative(job.created_at)}
                    {job.retry_count > 0 ? ` · ${job.retry_count} retry` : ""}
                  </p>
                </div>
                <JobStatus status={job.status} />
              </div>

              {job.error_message && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600">
                  {job.error_message}
                </p>
              )}

              {job.status === "completed" && job.result && <ResultSummary result={job.result} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JobStatus({ status }: { status: AnalysisJob["status"] }) {
  const tone = {
    queued: "bg-blue-50 text-blue-700",
    processing: "bg-yellow-50 text-yellow-700",
    completed: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-600",
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      <Activity className="h-3 w-3" />
      {status}
    </span>
  );
}

function ResultSummary({ result }: { result: AnalysisResult }) {
  const usefulEmbeddingMatches = result.embedding_matches?.filter(
    (match) => match.resume_version_name && match.similarity > 0
  ) ?? [];

  return (
    <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
      {result.summary && <p className="text-sm text-neutral-700">{result.summary}</p>}

      {(result.recommended_resume_name || typeof result.match_score === "number") && (
        <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
          <div>
            <p className="text-xs text-neutral-400">Recommended resume</p>
            <p className="text-sm font-medium text-neutral-800">{result.recommended_resume_name ?? "Not selected"}</p>
          </div>
          {typeof result.match_score === "number" && (
            <span className="text-sm font-semibold text-neutral-800">
              {Math.round(result.match_score * 100)}%
            </span>
          )}
        </div>
      )}

      <SkillList title="Matched Skills" items={result.matched_skills} tone="green" />
      <SkillList title="Missing Skills" items={result.missing_skills} tone="red" />
      <SkillList title="Extracted Keywords" items={result.extracted_keywords} tone="blue" />
      {result.seniority && (
        <div>
          <p className="mb-1.5 text-xs text-neutral-400">Seniority</p>
          <p className="text-sm font-medium capitalize text-neutral-700">{result.seniority}</p>
        </div>
      )}
      <BulletList title="Core Requirements" items={result.core_requirements} />
      <BulletList title="Responsibilities" items={result.responsibilities} />
      <BulletList title="Resume Feedback" items={result.resume_feedback} />
      <BulletList title="Interview Focus" items={result.interview_focus} />
      <BulletList title="Prep Plan" items={result.prep_plan} />
      <BulletList title="Talking Points" items={result.talking_points} />
      <BulletList title="Questions To Ask" items={result.suggested_questions} />

      {usefulEmbeddingMatches.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-neutral-400">Embedding Matches</p>
          <ul className="space-y-1">
            {usefulEmbeddingMatches.slice(0, 3).map((match) => (
              <li key={match.resume_version_id} className="flex items-center justify-between text-xs">
                <span className="text-neutral-600">{match.resume_version_name}</span>
                <span className="font-medium text-neutral-700">{Math.round(match.similarity * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SkillList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone: "green" | "red" | "blue";
}) {
  if (!items || items.length === 0) {
    return null;
  }
  const styles = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <div>
      <p className="mb-1.5 text-xs text-neutral-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BulletList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="mb-1.5 text-xs text-neutral-400">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-sm text-neutral-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatJobType(jobType: AnalysisJobType) {
  return jobType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
