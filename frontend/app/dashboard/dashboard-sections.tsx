import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Briefcase,
  CalendarClock,
  Activity,
  FileText,
  Info,
  ListChecks,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/utils";
import {
  type DashboardData,
  type FocusItemData,
  plural,
  STALE_DAYS,
} from "./dashboard-data";

export function StatCards({ stats }: { stats: DashboardData["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total" value={stats.total} icon={Briefcase} />
      <StatCard
        label="Active"
        value={stats.active}
        icon={Activity}
        accent="blue"
      />
      <StatCard
        label="Offers"
        value={stats.offers}
        icon={Award}
        accent="green"
      />
      <StatCard
        label="Stale"
        value={stats.stale}
        subtitle={`Waiting ${STALE_DAYS}+ days`}
        icon={AlertCircle}
        accent="amber"
      />
    </div>
  );
}

export function ActionSections({
  focusItems,
  nextBestAction,
}: {
  focusItems: DashboardData["focusItems"];
  nextBestAction: DashboardData["nextBestAction"];
}) {
  const visibleFocusItems = focusItems.slice(0, 5);
  const hiddenFocusCount = Math.max(
    0,
    focusItems.length - visibleFocusItems.length,
  );

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-800">
            Needs Attention
          </h2>
          <InfoTooltip
            title="Priority order"
            ordered
            items={[
              "Overdue follow-ups and deadlines",
              "Upcoming deadlines and interviews",
              "Follow-ups due today",
              "Applications ready for follow-up",
              "Stale applications and missing resume links",
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-neutral-400">
            {focusItems.length === 0
              ? "0 items"
              : `${visibleFocusItems.length} of ${focusItems.length}`}
          </span>
          <Link
            href="/applications"
            className="flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            View applications <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      {focusItems.length === 0 ? (
        <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {nextBestAction.title}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {nextBestAction.detail}
              </p>
            </div>
          </div>
          <Link
            href={nextBestAction.href}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            {nextBestAction.action} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 px-2 py-2 sm:px-3">
          {visibleFocusItems.map((item, index) => (
            <FocusItem key={item.id} featured={index === 0} {...item} />
          ))}
        </div>
      )}
      {hiddenFocusCount > 0 && (
        <div className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
          +{hiddenFocusCount} more application{plural(hiddenFocusCount)}
        </div>
      )}
    </section>
  );
}

export function PipelineSection({
  maxPipelineCount,
  pipeline,
}: {
  maxPipelineCount: DashboardData["maxPipelineCount"];
  pipeline: DashboardData["pipeline"];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-neutral-700">Pipeline</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-8">
        {pipeline.map((stage) => (
          <div key={stage.label} className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-neutral-500">
                {stage.label}
              </span>
              <span className="text-xs font-semibold text-neutral-700">
                {stage.count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${stage.color}`}
                style={{
                  width:
                    stage.count === 0
                      ? "0%"
                      : `${Math.max(8, Math.round((stage.count / maxPipelineCount) * 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActivitySections({
  recentApps,
  upcomingItems,
}: {
  recentApps: DashboardData["recentApps"];
  upcomingItems: DashboardData["upcomingItems"];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-700">
            Recently Changed
          </h2>
          <Link
            href="/applications"
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentApps.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Briefcase className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">No applications yet</p>
            <Link
              href="/applications/new"
              className="mt-2 inline-block text-xs text-blue-600 hover:underline"
            >
              Create your first one →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recentApps.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {app.title}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {app.company_name} · Updated{" "}
                      {formatRelative(app.updated_at)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-neutral-700">Upcoming</h2>
          </div>
          <Link
            href="/analytics"
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            View calendar <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {upcomingItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarClock className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">Nothing scheduled soon</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {upcomingItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      {item.label}
                    </p>
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-400">
                      {item.meta}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function ConversionSection({
  conversionMetrics,
  totalApps,
}: {
  conversionMetrics: DashboardData["conversionMetrics"];
  totalApps: DashboardData["totalApps"];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
        <FileText className="h-4 w-4 text-neutral-400" />
        <h2 className="text-sm font-semibold text-neutral-700">
          Conversion Snapshot
        </h2>
      </div>
      <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {conversionMetrics.map((metric) => (
          <div key={metric.label} className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {metric.value}/{totalApps}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {metric.rate}% of total apps
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "neutral" | "blue" | "green" | "purple" | "amber";
}) {
  const styles = {
    neutral: {
      border: "border-neutral-200",
      icon: "text-neutral-400",
      value: "text-neutral-900",
    },
    blue: {
      border: "border-blue-100",
      icon: "text-blue-500",
      value: "text-blue-600",
    },
    green: {
      border: "border-green-100",
      icon: "text-green-500",
      value: "text-green-600",
    },
    purple: {
      border: "border-purple-100",
      icon: "text-purple-500",
      value: "text-purple-600",
    },
    amber: {
      border: "border-amber-100",
      icon: "text-amber-500",
      value: "text-amber-600",
    },
  };
  const s = styles[accent];

  return (
    <div className={`rounded-lg border ${s.border} bg-white p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </p>
        <Icon className={`w-4 h-4 ${s.icon}`} />
      </div>
      <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );
}

function InfoTooltip({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={title}
        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:bg-neutral-100 focus-visible:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 top-8 z-20 w-64 rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:w-72 sm:-translate-x-1/2"
      >
        <p className="mb-2 font-semibold text-neutral-700">{title}</p>
        <List className={`space-y-1 ${ordered ? "list-decimal pl-4" : ""}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      </div>
    </div>
  );
}

function FocusItem({
  title,
  detail,
  href,
  action,
  tone,
  featured = false,
}: FocusItemData & { featured?: boolean }) {
  const tones = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    neutral: "bg-neutral-400",
  };

  return (
    <Link
      href={href}
      className={`flex min-h-20 items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-inset sm:px-4 ${featured ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-neutral-50"}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tones[tone]}`}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p>
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-neutral-400 sm:inline-flex">
        {action} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
