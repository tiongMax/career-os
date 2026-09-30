import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";

import type {
  Application,
  Company,
  Contact,
  InterviewRound,
  JobDescription,
  ResumeVersion,
} from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  TRACK_BADGE_CLASSES,
  formatTrackLabel,
} from "@/lib/domain/applications";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicationQuickActions } from "./application-quick-actions";
import { PortalPassword } from "./portal-password";
import type { StatusTimelineEvent } from "./page";

type WorkspaceProps = {
  application: Application;
  company: Company;
  resume: ResumeVersion | null;
  jobDescription: JobDescription | null;
  interviews: InterviewRound[];
  contacts: Contact[];
  timeline: StatusTimelineEvent[];
};

export function ApplicationWorkspace({
  application,
  company,
  resume,
  jobDescription,
  interviews,
  contacts,
  timeline,
}: WorkspaceProps) {
  const nextStep = getNextStep(application, resume, jobDescription, interviews);
  const NextStepIcon = nextStep.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Applications
      </Link>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <div className="border-b border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--accent)_100%)] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                <TrackBadges
                  tracks={
                    application.role_tracks?.length
                      ? application.role_tracks
                      : [application.role_track]
                  }
                />
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {application.title}
              </h1>
              <p className="mt-1 text-base font-medium text-muted-foreground">
                {company.name}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/applications/${application.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit details
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-4 rounded-card border border-blue-100 bg-white/85 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <NextStepIcon aria-hidden="true" className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                  Recommended next step
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {nextStep.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {nextStep.description}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Updated {formatRelative(application.updated_at)}
            </span>
          </div>
        </div>

        <div className="px-5 py-4 sm:px-7">
          <ApplicationQuickActions
            applicationId={application.id}
            currentStatus={application.status}
            jobDescription={jobDescription}
          />
        </div>
      </section>

      <nav
        aria-label="Application sections"
        className="flex gap-1 overflow-x-auto rounded-control border border-border bg-surface p-1 shadow-sm"
      >
        {[
          ["overview", "Overview"],
          ["role-resume", "Job description & resume"],
          ["interviews", "Interviews"],
          ["activity", "Activity"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 space-y-6">
          <section id="overview" className="scroll-mt-6 space-y-4">
            <SectionHeading
              title="Overview"
              description="The core details and context for this opportunity."
            />
            <Card>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Status" value={APPLICATION_STATUS_LABELS[application.status] ?? application.status} />
                  <Detail label="Applied" value={formatDate(application.applied_at)} />
                  <Detail label="Deadline" value={formatDate(application.deadline_at)} />
                  <Detail label="Source" value={application.source} />
                  <Detail label="Location" value={application.location} icon={MapPin} />
                  <Detail label="Employment" value={humanize(application.employment_type)} icon={BriefcaseBusiness} />
                </dl>

                {(application.job_url || application.notes) && (
                  <div className="mt-6 space-y-5 border-t border-border pt-5">
                    {application.job_url && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Job posting</p>
                        <a
                          href={application.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <span className="truncate">{application.job_url}</span>
                          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                        </a>
                      </div>
                    )}
                    {application.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {application.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {(application.portal_account || application.portal_password) && (
              <details className="rounded-card border border-border bg-surface shadow-card">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground sm:px-6">
                  Application portal credentials
                </summary>
                <div className="border-t border-border px-5 py-5 sm:px-6">
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    Sensitive information. Reveal only when you need to access the employer portal.
                  </p>
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Detail label="Account" value={application.portal_account} />
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Password</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {application.portal_password ? (
                          <PortalPassword value={application.portal_password} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </details>
            )}
          </section>

          <section id="role-resume" className="scroll-mt-6 space-y-4">
            <SectionHeading
              title="Job description & resume"
              description="Keep the job posting and the resume used for this application together."
            />
            <Card>
              <CardHeader>
                <CardTitle>Job description</CardTitle>
                <CardDescription>
                  The saved job posting and requirements for this opportunity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobDescription ? (
                  <div className="space-y-4">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                        Read full job description
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {jobDescription.raw_text}
                      </p>
                    </details>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={FileText}
                    title="No job description yet"
                    description="Use the Add job description action above to save the role requirements."
                  />
                )}
              </CardContent>
            </Card>

          </section>

          <section id="interviews" className="scroll-mt-6 space-y-4">
            <SectionHeading
              title="Interviews"
              description="Keep scheduled rounds, interviewers, and notes in one place."
            />
            <Card>
              <CardHeader>
                <CardTitle>Interview rounds</CardTitle>
                <CardDescription>
                  {interviews.length === 0
                    ? "No rounds scheduled yet."
                    : `${interviews.length} round${interviews.length === 1 ? "" : "s"} added.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interviews.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {interviews.map((interview) => (
                      <li key={interview.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {humanize(interview.round_type)}
                          </p>
                          {interview.interviewer && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              With {interview.interviewer}
                            </p>
                          )}
                          {interview.notes && (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {interview.notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-sm font-medium text-foreground">
                          {formatTimestamp(interview.scheduled_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Use Schedule interview above when the company confirms a round.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="activity" className="scroll-mt-6 space-y-4">
            <SectionHeading
              title="Activity"
              description="A clear history of how this application has progressed."
            />
            <Card>
              <CardContent>
                {timeline.length > 0 ? (
                  <Timeline events={timeline} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Status changes will appear here.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </main>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Attached resume</CardTitle>
            </CardHeader>
            <CardContent>
              {resume ? (
                <Link
                  href={`/resume-versions/${resume.id}/edit`}
                  className="group block rounded-control border border-border p-3 hover:border-border-strong hover:bg-surface-subtle"
                >
                  <div className="flex items-start gap-3">
                    <FileText aria-hidden="true" className="mt-0.5 size-4 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {resume.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTrackLabel(resume.track)}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No resume attached. Use Edit details to select one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company contacts</CardTitle>
              <CardDescription>
                {contacts.length > 0
                  ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"} at ${company.name}.`
                  : `No contacts saved for ${company.name}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <ul className="space-y-4">
                  {contacts.map((contact) => (
                    <li key={contact.id} className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                        <UserRound aria-hidden="true" className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {contact.name}
                        </Link>
                        {contact.role && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {contact.role}
                          </p>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Mail aria-hidden="true" className="size-3" />
                            Email
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/contacts/new">Add contact</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />}
        {value || "—"}
      </dd>
    </div>
  );
}

function TrackBadges({ tracks }: { tracks: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tracks.filter(Boolean).map((track) => (
        <span
          key={track}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRACK_BADGE_CLASSES[track] ?? "bg-surface-muted text-muted-foreground"}`}
        >
          {formatTrackLabel(track)}
        </span>
      ))}
    </div>
  );
}

function Timeline({ events }: { events: StatusTimelineEvent[] }) {
  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < events.length - 1 && (
            <span className="absolute left-1.5 top-3 h-full w-px bg-border" />
          )}
          <span className={`relative mt-1 size-3 shrink-0 rounded-full border-2 border-white ${timelineDot(event.status)}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            {event.detail && (
              <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatTimestamp(event.at, event.dateOnly)} · {formatRelative(event.at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function getNextStep(
  application: Application,
  resume: ResumeVersion | null,
  jobDescription: JobDescription | null,
  interviews: InterviewRound[],
) {
  const upcomingInterview = interviews
    .filter((interview) => interview.scheduled_at && new Date(interview.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  if (upcomingInterview) {
    return {
      icon: CalendarClock,
      title: `Prepare for the ${humanize(upcomingInterview.round_type)}`,
      description: `Scheduled ${formatRelative(upcomingInterview.scheduled_at)}. Review the role requirements and your interview notes.`,
    };
  }
  if (!jobDescription) {
    return {
      icon: FileText,
      title: "Add the job description",
      description: "Keep the role requirements available for reference.",
    };
  }
  if (!resume) {
    return {
      icon: FileText,
      title: "Attach a tailored resume",
      description: "Choose the version you used or plan to submit for this application.",
    };
  }
  return {
    icon: CalendarClock,
    title: "Keep the application moving",
    description: "Update the status when you hear back, or schedule the next interview round.",
  };
}

function humanize(value?: string): string {
  if (!value) return "";
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatTimestamp(iso?: string, dateOnly = false): string {
  if (!iso) return "Date not set";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
  });
}

function timelineDot(status: string): string {
  if (status === "offer") return "bg-green-500";
  if (status === "rejected") return "bg-red-500";
  if (status === "ghosted") return "bg-zinc-500";
  if (status === "withdrawn") return "bg-neutral-400";
  if (status.includes("screen") || status === "onsite") return "bg-indigo-500";
  return "bg-blue-500";
}
