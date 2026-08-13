import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getApplications,
  getCompanies,
  getReminders,
  type Application,
  type Company,
  type Reminder,
} from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { FollowUpActions } from "./follow-up-actions";
import { FollowUpDialog } from "./follow-up-dialog";
import {
  followUpGroup,
  formatFollowUpDate,
  type FollowUpGroup,
} from "./follow-up-utils";

const groupDetails: Record<
  Exclude<FollowUpGroup, "completed">,
  { title: string; description: string }
> = {
  overdue: {
    title: "Overdue",
    description: "These need your attention first.",
  },
  today: {
    title: "Today",
    description: "Follow-ups planned for today.",
  },
  upcoming: {
    title: "Upcoming",
    description: "Your next scheduled actions.",
  },
};

export default async function RemindersPage() {
  const reminders = await getReminders();
  const [applications, companies] = await Promise.all([
    safe(getApplications(), []),
    safe(getCompanies(), []),
  ]);
  const now = new Date();
  const groups = reminders.reduce<Partial<Record<FollowUpGroup, Reminder[]>>>(
    (result, reminder) => {
      const group = followUpGroup(reminder, now);
      (result[group] ??= []).push(reminder);
      return result;
    },
    {},
  );
  const openCount = reminders.filter(
    (reminder) => followUpGroup(reminder, now) !== "completed",
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Stay on track
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Follow-ups
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actions you want CareerOS to bring back to your dashboard at the
            right time.
          </p>
        </div>
        <FollowUpDialog applications={applications} />
      </header>

      <section aria-label="Follow-up summary" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={AlertCircle}
          label="Overdue"
          value={groups.overdue?.length ?? 0}
          tone="danger"
        />
        <SummaryCard
          icon={CalendarCheck2}
          label="Due today"
          value={groups.today?.length ?? 0}
          tone="primary"
        />
        <SummaryCard
          icon={Clock3}
          label="Open"
          value={openCount}
          tone="neutral"
        />
      </section>

      {openCount === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing needs a follow-up"
          description="Add a follow-up for an application and it will appear here—and on your dashboard when due."
          actions={<FollowUpDialog applications={applications} triggerSize="default" />}
        />
      ) : (
        <div className="space-y-8">
          {(["overdue", "today", "upcoming"] as const).map((group) => {
            const items = groups[group] ?? [];
            if (items.length === 0) return null;
            return (
              <FollowUpSection
                key={group}
                group={group}
                reminders={items}
                applications={applications}
                companies={companies}
              />
            );
          })}
        </div>
      )}

      {(groups.completed?.length ?? 0) > 0 && (
        <details className="rounded-card border border-border bg-surface shadow-card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-muted-foreground sm:px-6">
            Completed follow-ups ({groups.completed?.length ?? 0})
          </summary>
          <ul className="divide-y divide-border border-t border-border px-5 sm:px-6">
            {groups.completed?.map((reminder) => (
              <li key={reminder.id} className="flex items-center gap-3 py-4">
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                <Link
                  href={`/reminders/${reminder.id}`}
                  className="min-w-0 flex-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {reminder.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatFollowUpDate(reminder.due_at)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FollowUpSection({
  group,
  reminders,
  applications,
  companies,
}: {
  group: Exclude<FollowUpGroup, "completed">;
  reminders: Reminder[];
  applications: Application[];
  companies: Company[];
}) {
  const details = groupDetails[group];
  return (
    <section aria-labelledby={`${group}-title`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id={`${group}-title`} className="text-base font-semibold text-foreground">
            {details.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{details.description}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {reminders.length} {reminders.length === 1 ? "item" : "items"}
        </span>
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {reminders.map((reminder) => {
            const application = applications.find(
              (item) => item.id === reminder.application_id,
            );
            const company = companies.find(
              (item) => item.id === application?.company_id,
            );
            return (
              <li
                key={reminder.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <Link href={`/reminders/${reminder.id}`} className="group min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary">
                    {reminder.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application?.title ?? "Application"}
                    {company ? ` at ${company.name}` : ""}
                  </p>
                  <p
                    className={`mt-2 text-xs font-medium ${group === "overdue" ? "text-danger" : group === "today" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {formatFollowUpDate(reminder.due_at)} · {formatRelative(reminder.due_at)}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <FollowUpActions reminderId={reminder.id} compact />
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link href={`/reminders/${reminder.id}`} aria-label={`Open ${reminder.title}`}>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
  tone: "danger" | "primary" | "neutral";
}) {
  const toneClass = {
    danger: "bg-danger-soft text-danger",
    primary: "bg-accent text-accent-foreground",
    neutral: "bg-surface-muted text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className={`flex size-9 items-center justify-center rounded-full ${toneClass}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
