import type { AnalyticsSummary, Application, Company, Reminder, UpcomingData } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const STALE_DAYS = 14;
export const FOLLOW_UP_DAYS = 7;
export const DEADLINE_WINDOW_DAYS = 7;

const DAY_MS = 86_400_000;
const FINAL_STATUSES = new Set(["offer", "rejected", "withdrawn", "kiv"]);
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
  { label: "KIV", statuses: ["kiv"], color: "bg-yellow-500" },
];

export type FocusTone = "red" | "amber" | "blue" | "green" | "neutral";
export type FocusItemData = {
  id: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  tone: FocusTone;
};

type RankedFocusItem = FocusItemData & {
  applicationId?: string;
  priority: number;
  time: number;
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
  const followUpCutoff = now - FOLLOW_UP_DAYS * DAY_MS;

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
  const applicationsById = new Map(applications.map((application) => [application.id, application]));
  const focusByApplication = new Map<string, RankedFocusItem>();

  function addApplicationFocus(item: RankedFocusItem) {
    if (!item.applicationId) return;
    const current = focusByApplication.get(item.applicationId);
    if (!current || item.priority < current.priority || (item.priority === current.priority && item.time < current.time)) {
      focusByApplication.set(item.applicationId, item);
    }
  }

  for (const reminder of [...overdueReminders, ...dueTodayReminders]) {
    const application = applicationsById.get(reminder.application_id);
    if (!application) continue;
    const dueAt = new Date(reminder.due_at).getTime();
    addApplicationFocus({
      id: `reminder-${reminder.id}`,
      applicationId: application.id,
      priority: dueAt < now ? 0 : 2,
      time: dueAt,
      title: applicationLabel(application, companyMap),
      detail: `${dueAt < now ? "Overdue reminder" : "Reminder due today"}: ${reminder.title} · ${formatDate(reminder.due_at)}`,
      href: `/applications/${application.id}`,
      action: "Open application",
      tone: dueAt < now ? "red" : "amber",
    });
  }

  for (const application of applications) {
    if (FINAL_STATUSES.has(application.status) || application.status === "saved") continue;

    if (application.deadline_at) {
      const deadlineAt = new Date(application.deadline_at).getTime();
      if (deadlineAt <= deadlineCutoff) {
        const overdue = deadlineAt < now;
        addApplicationFocus({
          id: `deadline-${application.id}`,
          applicationId: application.id,
          priority: overdue ? 0 : 1,
          time: deadlineAt,
          title: applicationLabel(application, companyMap),
          detail: `${overdue ? "Deadline overdue" : "Deadline approaching"} · ${formatDate(application.deadline_at)}`,
          href: `/applications/${application.id}`,
          action: "Open application",
          tone: overdue ? "red" : "blue",
        });
      }
    }

    const appliedAt = new Date(application.applied_at ?? application.created_at).getTime();
    if (application.status === "applied" && appliedAt <= followUpCutoff) {
      addApplicationFocus({
        id: `follow-up-${application.id}`,
        applicationId: application.id,
        priority: 3,
        time: appliedAt,
        title: applicationLabel(application, companyMap),
        detail: `Follow up · applied ${daysSince(appliedAt, now)} days ago with no response`,
        href: `/applications/${application.id}`,
        action: "Open application",
        tone: "amber",
      });
    }

    const updatedAt = new Date(application.updated_at).getTime();
    if (updatedAt <= staleCutoff) {
      addApplicationFocus({
        id: `stale-${application.id}`,
        applicationId: application.id,
        priority: 4,
        time: updatedAt,
        title: applicationLabel(application, companyMap),
        detail: `Stale · no changes for ${daysSince(updatedAt, now)} days`,
        href: `/applications/${application.id}`,
        action: "Open application",
        tone: "amber",
      });
    }

    if (!application.resume_version_id) {
      addApplicationFocus({
        id: `resume-${application.id}`,
        applicationId: application.id,
        priority: 5,
        time: new Date(application.created_at).getTime(),
        title: applicationLabel(application, companyMap),
        detail: "Missing a linked resume version",
        href: `/applications/${application.id}`,
        action: "Open application",
        tone: "neutral",
      });
    }
  }

  const nextInterview = upcoming.interviews[0];
  const focusItems: FocusItemData[] = [
    ...(nextInterview
      ? [{
          id: `interview-${nextInterview.id}`,
          priority: 1,
          time: nextInterview.scheduled_at ? new Date(nextInterview.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER,
          title: `${nextInterview.company_name} · ${nextInterview.application_title}`,
          detail: `Prepare for ${nextInterview.round_type.replaceAll("_", " ")} · ${formatDate(nextInterview.scheduled_at)}`,
          href: "/analytics",
          action: "Open interview",
          tone: "blue" as const,
        }]
      : []),
    ...focusByApplication.values(),
  ]
    .sort((a, b) => a.priority - b.priority || a.time - b.time)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
      action: item.action,
      tone: item.tone,
    }));
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

function applicationLabel(application: Application, companyMap: Record<string, string>): string {
  return `${companyMap[application.company_id] ?? "Unknown company"} · ${application.title}`;
}

function daysSince(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}

export function plural(value: number): string {
  return value === 1 ? "" : "s";
}
