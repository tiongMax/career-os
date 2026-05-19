import Link from "next/link";
import {
  getApplication,
  getApplicationAuditLogs,
  getApplicationJobDescription,
  getApplicationInterviews,
  getCompany,
  getResumeVersion,
} from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function ApplicationDetailPage(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;

  const [app, auditLogs, interviews] = await Promise.all([
    getApplication(id),
    getApplicationAuditLogs(id).catch(() => []),
    getApplicationInterviews(id).catch(() => []),
  ]);

  const [company, resume, jobDescription] = await Promise.all([
    getCompany(app.company_id).catch(() => null),
    app.resume_version_id ? getResumeVersion(app.resume_version_id).catch(() => null) : Promise.resolve(null),
    getApplicationJobDescription(id).catch(() => null),
  ]);

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
        <StatusBadge status={app.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-5">
          <Card title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Track" value={<span className="capitalize">{app.role_track}</span>} />
              <Detail label="Source" value={app.source} />
              <Detail label="Location" value={app.location} />
              <Detail label="Employment" value={app.employment_type} />
              <Detail label="Applied" value={formatDate(app.applied_at)} />
              <Detail label="Deadline" value={formatDate(app.deadline_at)} />
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

          {jobDescription && (
            <Card title="Job Description">
              {jobDescription.extracted_keywords.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {jobDescription.extracted_keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-neutral-600 whitespace-pre-wrap line-clamp-6">
                {jobDescription.raw_text}
              </p>
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
        </section>

        <section className="space-y-5">
          <Card title="Resume">
            {resume ? (
              <div>
                <p className="text-sm font-medium text-neutral-800">{resume.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5 capitalize">{resume.track}</p>
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

          <Card title={`Audit Log (${auditLogs.length})`}>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-neutral-400">No changes yet</p>
            ) : (
              <ul className="space-y-3">
                {auditLogs.slice().reverse().map((log) => (
                  <li key={log.id} className="text-xs">
                    <p className="font-medium text-neutral-700 capitalize">{log.action.replace("_", " ")}</p>
                    <p className="text-neutral-400 mt-0.5">{formatRelative(log.created_at)}</p>
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
