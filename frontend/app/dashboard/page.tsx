import { getDashboard } from "@/lib/api";
import { buildDashboardData } from "./dashboard-data";
import {
  ActionSections,
  ActivitySections,
  ConversionSection,
  PipelineSection,
  StatCards,
} from "./dashboard-sections";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardPage() {
  const snapshot = await getDashboard();
  const dashboard = buildDashboardData(snapshot);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your pipeline, priorities, and next steps at a glance."
      />

      <StatCards stats={dashboard.stats} />
      <ActionSections
        focusItems={dashboard.focusItems}
        nextBestAction={dashboard.nextBestAction}
      />
      <PipelineSection
        maxPipelineCount={dashboard.maxPipelineCount}
        pipeline={dashboard.pipeline}
      />
      <ActivitySections
        recentApps={dashboard.recentApps}
        upcomingItems={dashboard.upcomingItems}
      />
      <ConversionSection
        conversionMetrics={dashboard.conversionMetrics}
        totalApps={dashboard.totalApps}
      />
    </div>
  );
}
