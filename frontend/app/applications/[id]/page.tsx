import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  type Application,
  type AuditLog,
  getApplication,
  getApplicationAuditLogs,
  getApplicationJobDescription,
  getApplicationInterviews,
  getCompany,
  getResumeVersion,
  getResumeVersions,
  getRecommendedResume,
  getPrepContext,
  getApplicationAnalysisJobs,
} from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { ExtractKeywordsButton } from "./extract-keywords-button";
import { PrepBriefCard } from "./prep-brief-card";
import { CompareResumeCard } from "./compare-resume-card";
import { AnalysisJobsCard } from "./analysis-jobs-card";
import { PortalPassword } from "./portal-password";
import { APPLICATION_STATUS_LABELS, TRACK_BADGE_CLASSES, formatTrackLabel } from "@/lib/domain/applications";

export default async function ApplicationDetailPage(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;

  const [app, auditLogs, interviews, analysisJobs] = await Promise.all([
    getApplication(id),
    getApplicationAuditLogs(id).catch(() => []),
    getApplicationInterviews(id).catch(() => []),
    getApplicationAnalysisJobs(id).catch(() => []),
  ]);

  const [company, resume, jobDescription, prepContext, allResumeVersions] = await Promise.all([
    getCompany(app.company_id).catch(() => null),
    app.resume_version_id ? getResumeVersion(app.resume_version_id).catch(() => null) : Promise.resolve(null),
    getApplicationJobDescription(id).catch(() => null),
    getPrepContext(id).catch(() => null),
    getResumeVersions().catch(() => []),
  ]);

  const contacts = prepContext?.contacts ?? [];

  const recommendedResume = jobDescription && jobDescription.extracted_keywords.length > 0
    ? await getRecommendedResume(id).catch(() => null)
    : null;
  const timelineEvents = statusTimelineEvents(app, auditLogs);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
            <Link href="/applications" className="hover:text-neutral-600">Applications</Link>
            <span>/</span>
            <span className="text-neutral-600">{app.title}</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">{app.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{company?.name ?? "Unknown company"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/applications/${app.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <StatusBadge status={app.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-5">
          <Card title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Track" value={<TrackBadges tracks={app.role_tracks?.length ? app.role_tracks : [app.role_track]} />} />
              <Detail label="Source" value={app.source} />
              <Detail label="Location" value={app.location} />
              <Detail label="Employment" value={app.employment_type} />
              <Detail label="Applied" value={formatDate(app.applied_at)} />
              {app.job_url && (
                <div className="col-span-2">
                  <dt className="text-xs text-neutral-400">Job URL</dt>
                  <dd className="mt-0.5">
                    <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                      {app.job_url}
                    </a>
                  </dd>
                </div>
              )}
              {app.notes && (
                <div className="col-span-2">
                  <dt className="text-xs text-neutral-400">Notes</dt>
                  <dd className="mt-0.5 text-sm text-neutral-700 whitespace-pre-wrap">{app.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          {(app.portal_account || app.portal_password) && (
            <Card title="Portal Login">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Detail label="Account" value={app.portal_account} />
                <Detail
                  label="Password"
                  value={
                    app.portal_password ? <PortalPassword value={app.portal_password} /> : null
                  }
                />
              </dl>
            </Card>
          )}

          {jobDescription && (
            <Card title="Job Description">
              {jobDescription.extracted_keywords.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {jobDescription.extracted_keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <ExtractKeywordsButton jdId={jobDescription.id} />
              )}
              <p className="text-sm text-neutral-600 whitespace-pre-wrap line-clamp-6 mt-3">
                {jobDescription.raw_text}
              </p>
            </Card>
          )}

          {recommendedResume && (
            <Card title="Resume Match">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{recommendedResume.resume_version.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{formatTrackLabel(recommendedResume.resume_version.track)}</p>
                </div>
                <span className={`text-lg font-semibold ${recommendedResume.score >= 0.7 ? "text-green-600" : recommendedResume.score >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                  {Math.round(recommendedResume.score * 100)}%
                </span>
              </div>
              {recommendedResume.matched.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-neutral-400 mb-1">Matched</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedResume.matched.map((kw) => (
                      <span key={kw} className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {recommendedResume.missing.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-400 mb-1">Missing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedResume.missing.map((kw) => (
                      <span key={kw} className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {jobDescription && jobDescription.extracted_keywords.length > 0 && allResumeVersions.length > 0 && (
            <Card title="Compare Resume">
              <CompareResumeCard jdId={jobDescription.id} resumeVersions={allResumeVersions} />
            </Card>
          )}

          {interviews.length > 0 && (
            <Card title={`Interviews (${interviews.length})`}>
              <ul className="space-y-3">
                {interviews.map((iv) => (
                  <li key={iv.id} className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 capitalize">{iv.round_type.replace("_", " ")}</p>
                      {iv.interviewer && <p className="text-xs text-neutral-400">{iv.interviewer}</p>}
                      {iv.notes && <p className="text-xs text-neutral-500 mt-0.5">{iv.notes}</p>}
                    </div>
                    <div className="text-right text-xs text-neutral-400 shrink-0 ml-4">
                      <p>{formatDate(iv.scheduled_at)}</p>
                      {iv.outcome && <p className="capitalize mt-0.5 text-neutral-600">{iv.outcome}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Prep Brief">
            <PrepBriefCard applicationId={id} />
          </Card>

          <Card title={`AI Analysis Jobs (${analysisJobs.length})`}>
            <AnalysisJobsCard applicationId={id} initialJobs={analysisJobs} />
          </Card>
        </section>

        <section className="space-y-5">
          <Card title="Resume">
            {resume ? (
              <div>
                <p className="text-sm font-medium text-neutral-800">{resume.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{formatTrackLabel(resume.track)}</p>
                {resume.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {resume.tags.map((t) => (
                      <span key={t} className="text-xs bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No resume attached</p>
            )}
          </Card>

          {contacts.length > 0 && (
            <Card title={`Company Contacts (${contacts.length})`}>
              <ul className="space-y-3">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <p className="text-sm font-medium text-neutral-800">{contact.name}</p>
                    {contact.role && <p className="text-xs text-neutral-400">{contact.role}</p>}
                    <div className="flex gap-2 mt-0.5">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title={`Status Timeline (${timelineEvents.length})`}>
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-neutral-400">No status history yet</p>
            ) : (
              <ul className="relative space-y-0">
                {timelineEvents.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < timelineEvents.length - 1 && (
                      <span className="absolute left-1.5 top-3 h-full w-px bg-neutral-200" />
                    )}
                    <span className={`relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white ${timelineDotClass(event.status)}`} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium text-neutral-800">{event.title}</p>
                        {event.detail && (
                          <p className="text-xs text-neutral-400">{event.detail}</p>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">{formatTimestamp(event.at, event.dateOnly)}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{formatRelative(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

type StatusTimelineEvent = {
  id: string;
  status: string;
  title: string;
  detail?: string;
  at: string;
  dateOnly?: boolean;
};

function statusTimelineEvents(application: Application, auditLogs: AuditLog[]): StatusTimelineEvent[] {
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
    const oldStatus = auditStatusValue(log.old_value);
    const newStatus = auditStatusValue(log.new_value);
    if (!newStatus) continue;

    const oldLabel = oldStatus ? statusLabel(oldStatus) : null;
    const newLabel = statusLabel(newStatus);
    events.push({
      id: log.id,
      status: newStatus,
      title: newLabel,
      detail: oldLabel ? `${oldLabel} -> ${newLabel}` : log.action.replace("_", " "),
      at: log.created_at,
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function statusLabel(status: string): string {
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

function timelineDotClass(status: string): string {
  switch (status) {
    case "applied":
      return "bg-blue-500";
    case "rejected":
      return "bg-red-500";
    case "offer":
      return "bg-green-500";
    case "withdrawn":
      return "bg-neutral-400";
    case "onsite":
      return "bg-orange-500";
    case "technical_screen":
      return "bg-indigo-500";
    case "recruiter_screen":
      return "bg-purple-500";
    default:
      return "bg-slate-400";
  }
}

function formatTimestamp(iso: string, dateOnly = false): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (!dateOnly) {
    options.hour = "numeric";
    options.minute = "2-digit";
  }

  return new Date(iso).toLocaleString("en-US", options);
}

function auditStatusValue(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("status" in value)) return null;

  const status = (value as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="px-5 py-3.5 text-sm font-medium text-neutral-700 border-b border-neutral-100">{title}</h2>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-700">{value ?? "—"}</dd>
    </div>
  );
}

function TrackBadges({ tracks }: { tracks: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tracks.filter(Boolean).map((track) => (
        <span key={track} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TRACK_BADGE_CLASSES[track] ?? "bg-neutral-100 text-neutral-600"}`}>
          {formatTrackLabel(track)}
        </span>
      ))}
    </div>
  );
}
