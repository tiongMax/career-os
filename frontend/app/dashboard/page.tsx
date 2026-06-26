import { getAnalyticsSummary, getAnalyticsUpcoming, getApplications, getCompanies, getReminders } from "@/lib/api";
import { buildDashboardData } from "./dashboard-data";
import {
  ActionSections,
  ActivitySections,
  ConversionSection,
  PipelineSection,
  StatCards,
} from "./dashboard-sections";

export default async function DashboardPage() {
  const [summary, applications, companies, reminders, upcoming] = await Promise.all([
    getAnalyticsSummary().catch(() => null),
    getApplications().catch(() => []),
    getCompanies().catch(() => []),
    getReminders().catch(() => []),
    getAnalyticsUpcoming().catch(() => ({ interviews: [], reminders: [] })),
  ]);

  const dashboard = buildDashboardData({
    summary,
    applications,
    companies,
    reminders,
    upcoming,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Your job search at a glance</p>
      </div>

      <StatCards stats={dashboard.stats} />
      <ActionSections focusItems={dashboard.focusItems} nextBestAction={dashboard.nextBestAction} />
      <PipelineSection maxPipelineCount={dashboard.maxPipelineCount} pipeline={dashboard.pipeline} />
      <ActivitySections
        companyMap={dashboard.companyMap}
        recentApps={dashboard.recentApps}
        upcomingItems={dashboard.upcomingItems}
      />
      <ConversionSection conversionMetrics={dashboard.conversionMetrics} totalApps={dashboard.totalApps} />
    </div>
  );
}
