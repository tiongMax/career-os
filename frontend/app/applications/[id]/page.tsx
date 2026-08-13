import {
  type Application,
  type AuditLog,
  getApplication,
  getApplicationAnalysisJobs,
  getApplicationAuditLogs,
  getApplicationInterviews,
  getApplicationJobDescription,
  getCompany,
  getPrepContext,
  getRecommendedResume,
  getResumeVersion,
  getResumeVersions,
} from "@/lib/api";
import { optionalEntity, requireEntity } from "@/lib/server-data";
import { ApplicationWorkspace } from "./application-workspace";
import { APPLICATION_STATUS_LABELS } from "@/lib/domain/applications";

export default async function ApplicationDetailPage(
  props: PageProps<"/applications/[id]">,
) {
  const { id } = await props.params;
  const application = await requireEntity(getApplication(id));

  const [company, resume, jobDescription, auditLogs, interviews, analysisJobs, prepContext, resumes] =
    await Promise.all([
      requireEntity(getCompany(application.company_id)),
      application.resume_version_id
        ? safe(getResumeVersion(application.resume_version_id), null)
        : Promise.resolve(null),
      safe(optionalEntity(getApplicationJobDescription(id)), null),
      safe(getApplicationAuditLogs(id), []),
      safe(getApplicationInterviews(id), []),
      safe(getApplicationAnalysisJobs(id), []),
      safe(getPrepContext(id), null),
      safe(getResumeVersions(), []),
    ]);

  const recommendedResume =
    jobDescription && jobDescription.extracted_keywords.length > 0
      ? await safe(optionalEntity(getRecommendedResume(id)), null)
      : null;

  return (
    <ApplicationWorkspace
      application={application}
      company={company}
      resume={resume}
      jobDescription={jobDescription}
      interviews={interviews}
      analysisJobs={analysisJobs}
      contacts={prepContext?.contacts ?? []}
      resumeVersions={resumes}
      recommendedResume={recommendedResume}
      timeline={statusTimelineEvents(application, auditLogs)}
    />
  );
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export type StatusTimelineEvent = {
  id: string;
  status: string;
  title: string;
  detail?: string;
  at: string;
  receivedAt?: string;
  completedAt?: string;
  dateOnly?: boolean;
};

function statusTimelineEvents(
  application: Application,
  auditLogs: AuditLog[],
): StatusTimelineEvent[] {
  const events: StatusTimelineEvent[] = [];

  if (application.applied_at) {
    events.push({
      id: "applied-at",
      status: "applied",
      title: "Applied",
      detail: "Application date",
      at: application.applied_at,
      dateOnly: true,
    });
  }

  for (const log of auditLogs) {
    const oldStatus = auditStringValue(log.old_value, "status");
    const newStatus = auditStringValue(log.new_value, "status");
    if (!newStatus) continue;

    const receivedAt = auditStringValue(log.new_value, "received_at");
    const completedAt = auditStringValue(log.new_value, "completed_at");
    events.push({
      id: log.id,
      status: newStatus,
      title: APPLICATION_STATUS_LABELS[newStatus] ?? newStatus,
      detail: oldStatus
        ? `${APPLICATION_STATUS_LABELS[oldStatus] ?? oldStatus} → ${APPLICATION_STATUS_LABELS[newStatus] ?? newStatus}`
        : humanize(log.action),
      at: log.created_at,
      receivedAt: receivedAt ?? undefined,
      completedAt: completedAt ?? undefined,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.receivedAt ?? b.at).getTime() -
      new Date(a.receivedAt ?? a.at).getTime(),
  );
}

function auditStringValue(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : null;
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}
