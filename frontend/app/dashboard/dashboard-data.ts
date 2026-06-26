import type { AnalyticsSummary, Application, Company, Reminder, UpcomingData } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const STALE_DAYS = 14;
export const DEADLINE_WINDOW_DAYS = 7;

const DAY_MS = 86_400_000;
const FINAL_STATUSES = new Set(["offer", "rejected", "withdrawn"]);
const RESPONDED_STATUSES = new Set([
  "online_assessment",
  "recruiter_screen",
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
  "onsite",
  "offer",
  "rejected",
]);
const INTERVIEW_STATUSES = new Set([
  "recruiter_screen",
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
  "onsite",
  "offer",
]);

const PIPELINE_STAGES = [
  { label: "Saved", statuses: ["saved"], color: "bg-slate-400" },
  { label: "Applied", statuses: ["applied"], color: "bg-blue-500" },
  { label: "OA", statuses: ["online_assessment"], color: "bg-cyan-500" },
  { label: "Recruiter", statuses: ["recruiter_screen"], color: "bg-purple-500" },
  {
    label: "Technical",
    statuses: ["technical_screen", "technical_screen_2", "technical_screen_3", "technical_screen_4"],
    color: "bg-indigo-500",
  },
  { label: "Onsite", statuses: ["onsite"], color: "bg-orange-500" },
  { label: "Offer", statuses: ["offer"], color: "bg-green-500" },
  { label: "Rejected", statuses: ["rejected"], color: "bg-red-500" },
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

export function buildDashboardData({
  summary,
  applications,
  companies,
  reminders,
  upcoming,
}: {
  summary: AnalyticsSummary | null;
  applications: Application[];
  companies: Company[];
  reminders: Reminder[];
  upcoming: UpcomingData;
}) {
  const companyMap = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const now = Date.now();
  const todayEnd = endOfDay(new Date()).getTime();
  const deadlineCutoff = now + DEADLINE_WINDOW_DAYS * DAY_MS;
  const staleCutoff = now - STALE_DAYS * DAY_MS;

  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");
  const overdueReminders = pendingReminders.filter((reminder) => new Date(reminder.due_at).getTime() < now);
  const dueTodayReminders = pendingReminders.filter((reminder) => {
    const dueAt = new Date(reminder.due_at).getTime();
    return dueAt >= now && dueAt <= todayEnd;
  });
  const staleApplications = applications.filter((app) => {
    if (FINAL_STATUSES.has(app.status) || app.status === "saved") return false;
    return new Date(app.updated_at).getTime() <= staleCutoff;
  });
  const upcomingDeadlines = applications
    .filter((app) => {
      if (!app.deadline_at || FINAL_STATUSES.has(app.status)) return false;
      const deadlineAt = new Date(app.deadline_at).getTime();
      return deadlineAt >= now && deadlineAt <= deadlineCutoff;
    })
    .sort((a, b) => new Date(a.deadline_at ?? "").getTime() - new Date(b.deadline_at ?? "").getTime());
  const missingResumeVersion = applications.filter((app) => !app.resume_version_id && !FINAL_STATUSES.has(app.status));
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const totalApps = summary?.total ?? applications.length;
  const responded = summary?.responded ?? applications.filter((app) => RESPONDED_STATUSES.has(app.status)).length;
  const interviewed = applications.filter((app) => INTERVIEW_STATUSES.has(app.status)).length;
  const offers = summary?.offers ?? applications.filter((app) => app.status === "offer").length;
  const rejected = applications.filter((app) => app.status === "rejected").length;
  const active = summary?.active ?? applications.filter((app) => !FINAL_STATUSES.has(app.status) && app.status !== "saved").length;
  const pipeline = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: applications.filter((app) => stage.statuses.includes(app.status)).length,
  }));
  const maxPipelineCount = Math.max(...pipeline.map((stage) => stage.count), 1);
  const upcomingItems = [
    ...upcoming.interviews.map((interview) => ({
      id: `interview-${interview.id}`,
      label: "Interview",
      title: interview.company_name,
      meta: `${interview.application_title} · ${formatDate(interview.scheduled_at)}`,
      href: "/analytics",
      time: interview.scheduled_at ? new Date(interview.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER,
    })),
    ...upcoming.reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      label: "Reminder",
      title: reminder.title,
      meta: `${reminder.application_title} · ${formatDate(reminder.due_at)}`,
      href: `/reminders/${reminder.id}`,
      time: new Date(reminder.due_at).getTime(),
    })),
    ...upcomingDeadlines.slice(0, 5).map((app) => ({
      id: `deadline-${app.id}`,
      label: "Deadline",
      title: app.title,
      meta: `${companyMap[app.company_id] ?? "Unknown company"} · ${formatDate(app.deadline_at)}`,
      href: `/applications/${app.id}`,
      time: new Date(app.deadline_at ?? "").getTime(),
    })),
  ]
    .sort((a, b) => a.time - b.time)
    .slice(0, 5);

  const conversionMetrics = [
    { label: "Heard back", value: responded, rate: percentage(responded, totalApps) },
    { label: "Interview stage", value: interviewed, rate: percentage(interviewed, totalApps) },
    { label: "Offers", value: offers, rate: percentage(offers, totalApps) },
    { label: "Rejected", value: rejected, rate: percentage(rejected, totalApps) },
  ];
  const nextInterview = upcoming.interviews[0];
  const nextReminder = upcoming.reminders[0];
  const focusItems: FocusItemData[] = [
    overdueReminders.length > 0 && {
      title: "Clear overdue reminders",
      detail: `${overdueReminders.length} pending reminder${plural(overdueReminders.length)} past due`,
      href: "/reminders",
      action: "Open reminders",
      tone: "red",
    },
    dueTodayReminders.length > 0 && {
      title: "Handle today's follow-ups",
      detail: `${dueTodayReminders.length} reminder${plural(dueTodayReminders.length)} due today`,
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
    upcomingDeadlines.length > 0 && {
      title: "Protect the nearest deadline",
      detail: `${upcomingDeadlines[0].title} · ${formatDate(upcomingDeadlines[0].deadline_at)}`,
      href: `/applications/${upcomingDeadlines[0].id}`,
      action: "Open application",
      tone: "blue",
    },
    staleApplications.length > 0 && {
      title: "Follow up on stale applications",
      detail: `${staleApplications.length} active application${plural(staleApplications.length)} waiting ${STALE_DAYS}+ days`,
      href: "/applications",
      action: "Review stale apps",
      tone: "amber",
    },
    missingResumeVersion.length > 0 && {
      title: "Clean up missing resume links",
      detail: `${missingResumeVersion.length} active application${plural(missingResumeVersion.length)} without a resume version`,
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
          detail: "No urgent items right now. Add a new role or review recent changes.",
          href: "/applications",
          action: "Open applications",
          tone: "green" as const,
        });

  return {
    companyMap,
    conversionMetrics,
    focusItems,
    maxPipelineCount,
    nextBestAction,
    pipeline,
    recentApps,
    stats: {
      total: totalApps,
      active,
      offers,
      stale: staleApplications.length,
    },
    totalApps,
    upcomingItems,
  };
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function plural(value: number): string {
  return value === 1 ? "" : "s";
}
