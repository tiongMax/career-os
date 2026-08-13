import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileText,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplication, getCompany, getContact, getReminder } from "@/lib/api";
import { requireEntity } from "@/lib/server-data";
import { formatRelative } from "@/lib/utils";
import { FollowUpActions } from "../follow-up-actions";
import { FollowUpDialog } from "../follow-up-dialog";
import { followUpGroup, formatFollowUpDate } from "../follow-up-utils";

export default async function ReminderDetailPage(
  props: PageProps<"/reminders/[id]">,
) {
  const { id } = await props.params;
  const reminder = await requireEntity(getReminder(id));
  const application = await requireEntity(getApplication(reminder.application_id));
  const [company, contact] = await Promise.all([
    safe(getCompany(application.company_id), null),
    reminder.contact_id ? safe(getContact(reminder.contact_id), null) : null,
  ]);
  const group = followUpGroup(reminder);
  const completed = group === "completed";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/reminders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Follow-ups
      </Link>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <div className="border-b border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--accent)_100%)] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <StatusPill group={group} />
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {reminder.title}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <CalendarClock aria-hidden="true" className="size-4" />
                {formatFollowUpDate(reminder.due_at)} · {formatRelative(reminder.due_at)}
              </p>
            </div>
            {!completed && (
              <FollowUpDialog
                applicationId={application.id}
                reminder={reminder}
                triggerLabel="Edit"
                triggerVariant="outline"
              />
            )}
          </div>
        </div>
        {!completed && (
          <div className="px-5 py-4 sm:px-7">
            <FollowUpActions reminderId={reminder.id} redirectAfterDelete />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What to do</CardTitle>
            </CardHeader>
            <CardContent>
              {reminder.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {reminder.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No additional notes were added.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related application</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/applications/${application.id}`}
                className="group flex items-start gap-3 rounded-control border border-border p-4 hover:border-border-strong hover:bg-surface-subtle"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <BriefcaseBusiness aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary">
                    {application.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {company?.name ?? "Company unavailable"}
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Detail label="Due" value={formatFollowUpDate(reminder.due_at)} />
              <Detail label="Created" value={formatFollowUpDate(reminder.created_at)} />
              <p className="text-xs leading-5 text-muted-foreground">
                This appears on your dashboard when due. CareerOS does not send
                a notification.
              </p>
            </CardContent>
          </Card>

          {contact && (
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="group flex items-start gap-3"
                >
                  <UserRound aria-hidden="true" className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {contact.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {contact.role ?? "Contact"}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ group }: { group: ReturnType<typeof followUpGroup> }) {
  const config = {
    overdue: { icon: CalendarClock, label: "Overdue", style: "bg-danger-soft text-danger" },
    today: { icon: CalendarClock, label: "Due today", style: "bg-accent text-accent-foreground" },
    upcoming: { icon: FileText, label: "Upcoming", style: "bg-surface-muted text-muted-foreground" },
    completed: { icon: CheckCircle2, label: "Completed", style: "bg-success-soft text-success" },
  }[group];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.style}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {config.label}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
