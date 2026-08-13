"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createAnalysisJob,
  type AnalysisJob,
  type AnalysisJobType,
  type AnalysisResult,
} from "@/lib/api";
import { formatRelative } from "@/lib/utils";

const analysisActions: Array<{
  type: AnalysisJobType;
  label: string;
  description: string;
}> = [
  {
    type: "resume_match",
    label: "Check resume fit",
    description: "Find strengths and gaps against this role.",
  },
  {
    type: "jd_extract",
    label: "Analyze the role",
    description: "Pull out requirements, responsibilities, and seniority.",
  },
  {
    type: "prep_brief",
    label: "Build a prep plan",
    description: "Create interview focus areas and talking points.",
  },
];

export function AnalysisJobsCard({
  applicationId,
  initialJobs,
}: {
  applicationId: string;
  initialJobs: AnalysisJob[];
}) {
  const router = useRouter();
  const [optimisticJobs, setOptimisticJobs] = useState<AnalysisJob[]>([]);
  const [pendingType, setPendingType] = useState<AnalysisJobType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const jobs = useMemo(() => {
    const serverIds = new Set(initialJobs.map((job) => job.id));
    return [
      ...optimisticJobs.filter((job) => !serverIds.has(job.id)),
      ...initialJobs,
    ];
  }, [initialJobs, optimisticJobs]);
  const hasActiveAnalysis = jobs.some(
    (job) => job.status === "queued" || job.status === "processing",
  );

  useEffect(() => {
    if (!hasActiveAnalysis) return;
    const interval = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(interval);
  }, [hasActiveAnalysis, router]);

  const latestByType = useMemo(
    () =>
      Object.fromEntries(
        analysisActions.map(({ type }) => [
          type,
          jobs.find((job) => job.job_type === type),
        ]),
      ) as Partial<Record<AnalysisJobType, AnalysisJob>>,
    [jobs],
  );

  async function startAnalysis(type: AnalysisJobType) {
    setPendingType(type);
    setError(null);
    try {
      const job = await createAnalysisJob(applicationId, type);
      setOptimisticJobs((current) => [job, ...current]);
      startRefresh(() => router.refresh());
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setPendingType(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {analysisActions.map((action) => {
          const latest = latestByType[action.type];
          const active =
            latest?.status === "queued" || latest?.status === "processing";
          return (
            <div
              key={action.type}
              className="flex flex-col rounded-card border border-border bg-surface p-4"
            >
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {action.label}
              </h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">
                {action.description}
              </p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                size="sm"
                onClick={() => void startAnalysis(action.type)}
                disabled={pendingType !== null || active}
              >
                {active && <RefreshCw aria-hidden="true" className="animate-spin" />}
                {pendingType === action.type
                  ? "Starting…"
                  : active
                    ? "Working…"
                    : latest?.status === "completed"
                      ? "Run again"
                      : latest?.status === "failed"
                        ? "Try again"
                        : "Start"}
              </Button>
            </div>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {hasActiveAnalysis && (
        <div className="flex items-center gap-2 rounded-control bg-accent px-3 py-2 text-sm text-accent-foreground">
          <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
          Analysis is in progress. This section will update automatically.
        </div>
      )}

      <LatestResults jobs={jobs} />

      {jobs.length > 0 && (
        <details className="rounded-control border border-border bg-surface-subtle">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground">
            Analysis history
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-3 py-3 text-xs"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {analysisLabel(job.job_type)}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Started {formatRelative(job.created_at)}
                  </p>
                </div>
                <AnalysisStatus status={job.status} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        AI insights are generated from the job description and resume information
        saved here. Treat them as suggestions and verify important claims before
        using them.
      </p>
    </div>
  );
}

function LatestResults({ jobs }: { jobs: AnalysisJob[] }) {
  const completed = analysisActions
    .map(({ type }) =>
      jobs.find(
        (job) =>
          job.job_type === type && job.status === "completed" && job.result,
      ),
    )
    .filter((job): job is AnalysisJob & { result: AnalysisResult } => Boolean(job));

  if (completed.length === 0) {
    return (
      <div className="rounded-control border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        Choose an analysis above when you want a second opinion on this role.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completed.map((job) => (
        <section
          key={job.id}
          className="rounded-card border border-border bg-surface p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {analysisLabel(job.job_type)}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Generated {formatRelative(job.completed_at ?? job.updated_at)}
              </p>
            </div>
            {typeof job.result.match_score === "number" && (
              <span className="text-xl font-semibold text-primary">
                {Math.round(job.result.match_score * 100)}%
              </span>
            )}
          </div>
          <ResultSummary result={job.result} />
        </section>
      ))}
    </div>
  );
}

function AnalysisStatus({ status }: { status: AnalysisJob["status"] }) {
  const config = {
    queued: { icon: Clock3, label: "Waiting", className: "text-primary" },
    processing: { icon: RefreshCw, label: "Working", className: "text-warning" },
    completed: { icon: CheckCircle2, label: "Ready", className: "text-success" },
    failed: { icon: AlertCircle, label: "Needs retry", className: "text-danger" },
  }[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${config.className}`}>
      <Icon
        aria-hidden="true"
        className={`size-3.5 ${status === "processing" ? "animate-spin" : ""}`}
      />
      {config.label}
    </span>
  );
}

function ResultSummary({ result }: { result: AnalysisResult }) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {result.summary && (
        <p className="text-sm leading-6 text-foreground">{result.summary}</p>
      )}
      {result.recommended_resume_name && (
        <div className="rounded-control bg-surface-subtle px-3 py-2">
          <p className="text-xs text-muted-foreground">Suggested resume</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {result.recommended_resume_name}
          </p>
        </div>
      )}
      <SkillList title="Strong matches" items={result.matched_skills} tone="success" />
      <SkillList title="Gaps to review" items={result.missing_skills} tone="danger" />
      <SkillList title="Role keywords" items={result.extracted_keywords} tone="accent" />
      {result.seniority && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Seniority</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {capitalize(result.seniority)}
          </p>
        </div>
      )}
      <BulletList title="Core requirements" items={result.core_requirements} />
      <BulletList title="Responsibilities" items={result.responsibilities} />
      <BulletList title="Resume suggestions" items={result.resume_feedback} />
      <BulletList title="Interview focus" items={result.interview_focus} />
      <BulletList title="Preparation plan" items={result.prep_plan} />
      <BulletList title="Talking points" items={result.talking_points} />
      <BulletList title="Questions to ask" items={result.suggested_questions} />
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
  tone: "success" | "danger" | "accent";
}) {
  if (!items?.length) return null;
  const styles = {
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent text-accent-foreground",
  }[tone];
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BulletList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function analysisLabel(type: AnalysisJobType): string {
  return (
    analysisActions.find((action) => action.type === type)?.label ??
    capitalize(type.replaceAll("_", " "))
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/^API \d+:\s*/, "") || "Could not start the analysis.";
}
