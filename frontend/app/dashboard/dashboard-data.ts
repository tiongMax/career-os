import type { DashboardSnapshot } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const STALE_DAYS = 14;

const PIPELINE_STAGES = [
  { label: "Saved", statuses: ["saved"], color: "bg-slate-400" },
  { label: "Applied", statuses: ["applied"], color: "bg-blue-500" },
  { label: "OA", statuses: ["online_assessment"], color: "bg-cyan-500" },
  {
    label: "Recruiter",
    statuses: ["recruiter_screen"],
    color: "bg-purple-500",
  },
  {
    label: "Technical",
    statuses: [
      "technical_screen",
      "technical_screen_2",
      "technical_screen_3",
      "technical_screen_4",
    ],
    color: "bg-indigo-500",
  },
  { label: "Onsite", statuses: ["onsite"], color: "bg-orange-500" },
  { label: "Offer", statuses: ["offer"], color: "bg-green-500" },
  { label: "Rejected", statuses: ["rejected"], color: "bg-red-500" },
  { label: "KIV", statuses: ["kiv"], color: "bg-yellow-500" },
];

export type FocusTone = "red" | "amber" | "blue" | "green" | "neutral";
export type FocusItemData = {
  title: string;
  detail: string;
  href: string;
  action: string;
  tone: FocusTone;
};

export type DashboardData = ReturnType<typeof buildDashboardData>;

export function emptyDashboardSnapshot(): DashboardSnapshot {
  return {
    generated_at: new Date().toISOString(),
    summary: {
      total: 0,
      active: 0,
      responded: 0,
      interviewed: 0,
      offers: 0,
      rejected: 0,
    },
    attention: {
      overdue_reminders: 0,
      due_today_reminders: 0,
      stale_applications: 0,
      missing_resume_version: 0,
    },
    pipeline: {},
    recent_applications: [],
    upcoming: { interviews: [], reminders: [], deadlines: [] },
  };
}

export function buildDashboardData(snapshot: DashboardSnapshot) {
  const totalApps = snapshot.summary.total;
  const pipeline = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: stage.statuses.reduce(
      (total, status) => total + (snapshot.pipeline[status] ?? 0),
      0,
    ),
  }));
  const maxPipelineCount = Math.max(...pipeline.map((stage) => stage.count), 1);
  const upcomingItems = [
    ...snapshot.upcoming.interviews.map((interview) => ({
      id: `interview-${interview.id}`,
      label: "Interview",
      title: interview.company_name,
      meta: `${interview.application_title} · ${formatDate(interview.scheduled_at)}`,
      href: "/analytics",
      time: new Date(interview.scheduled_at).getTime(),
    })),
    ...snapshot.upcoming.reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      label: "Reminder",
      title: reminder.title,
      meta: `${reminder.application_title} · ${formatDate(reminder.due_at)}`,
      href: `/reminders/${reminder.id}`,
      time: new Date(reminder.due_at).getTime(),
    })),
    ...snapshot.upcoming.deadlines.map((deadline) => ({
      id: `deadline-${deadline.id}`,
      label: "Deadline",
      title: deadline.title,
      meta: `${deadline.company_name} · ${formatDate(deadline.deadline_at)}`,
      href: `/applications/${deadline.id}`,
      time: new Date(deadline.deadline_at).getTime(),
    })),
  ]
    .sort((a, b) => a.time - b.time)
    .slice(0, 5);

  const conversionMetrics = [
    {
      label: "Heard back",
      value: snapshot.summary.responded,
      rate: percentage(snapshot.summary.responded, totalApps),
    },
    {
      label: "Interview stage",
      value: snapshot.summary.interviewed,
      rate: percentage(snapshot.summary.interviewed, totalApps),
    },
    {
      label: "Offers",
      value: snapshot.summary.offers,
      rate: percentage(snapshot.summary.offers, totalApps),
    },
    {
      label: "Rejected",
      value: snapshot.summary.rejected,
      rate: percentage(snapshot.summary.rejected, totalApps),
    },
  ];
  const nextInterview = snapshot.upcoming.interviews[0];
  const nextReminder = snapshot.upcoming.reminders[0];
  const nextDeadline = snapshot.upcoming.deadlines[0];
  const focusItems: FocusItemData[] = [
    snapshot.attention.overdue_reminders > 0 && {
      title: "Clear overdue reminders",
      detail: `${snapshot.attention.overdue_reminders} pending reminder${plural(snapshot.attention.overdue_reminders)} past due`,
      href: "/reminders",
      action: "Open reminders",
      tone: "red",
    },
    snapshot.attention.due_today_reminders > 0 && {
      title: "Handle today's follow-ups",
      detail: `${snapshot.attention.due_today_reminders} reminder${plural(snapshot.attention.due_today_reminders)} due today`,
      href: "/reminders",
      action: "Review due items",
      tone: "amber",
    },
    nextInterview && {
      title: "Prep the next interview",
      detail: `${nextInterview.company_name} · ${formatDate(nextInterview.scheduled_at)}`,
      href: "/analytics",
      action: "Open interview queue",
      tone: "blue",
    },
    nextDeadline && {
      title: "Protect the nearest deadline",
      detail: `${nextDeadline.title} · ${formatDate(nextDeadline.deadline_at)}`,
      href: `/applications/${nextDeadline.id}`,
      action: "Open application",
      tone: "blue",
    },
    snapshot.attention.stale_applications > 0 && {
      title: "Follow up on stale applications",
      detail: `${snapshot.attention.stale_applications} active application${plural(snapshot.attention.stale_applications)} waiting ${STALE_DAYS}+ days`,
      href: "/applications",
      action: "Review stale apps",
      tone: "amber",
    },
    snapshot.attention.missing_resume_version > 0 && {
      title: "Clean up missing resume links",
      detail: `${snapshot.attention.missing_resume_version} active application${plural(snapshot.attention.missing_resume_version)} without a resume version`,
      href: "/applications",
      action: "Review applications",
      tone: "neutral",
    },
    nextReminder && {
      title: "Check the next reminder",
      detail: `${nextReminder.title} · ${formatDate(nextReminder.due_at)}`,
      href: `/reminders/${nextReminder.id}`,
      action: "Open reminder",
      tone: "neutral",
    },
  ].filter((item): item is FocusItemData => Boolean(item));
  const nextBestAction =
    focusItems[0] ??
    (totalApps === 0
      ? {
          title: "Create your first application",
          detail: "Start tracking a role so the dashboard can guide the rest.",
          href: "/applications/new",
          action: "New application",
          tone: "green" as const,
        }
      : {
          title: "Keep the pipeline moving",
          detail:
            "No urgent items right now. Add a new role or review recent changes.",
          href: "/applications",
          action: "Open applications",
          tone: "green" as const,
        });

  return {
    conversionMetrics,
    focusItems,
    maxPipelineCount,
    nextBestAction,
    pipeline,
    recentApps: snapshot.recent_applications,
    stats: {
      total: totalApps,
      active: snapshot.summary.active,
      offers: snapshot.summary.offers,
      stale: snapshot.attention.stale_applications,
    },
    totalApps,
    upcomingItems,
  };
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function plural(value: number): string {
  return value === 1 ? "" : "s";
}
