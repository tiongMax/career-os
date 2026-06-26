import { ExportSection } from "./export-section";
import {
  getAnalyticsSummary,
  getAnalyticsByStatus,
  getAnalyticsByTrack,
  getAnalyticsByResumeVersion,
  getAnalyticsSourcePerformance,
  getAnalyticsFunnel,
  getAnalyticsUpcoming,
  type AnalyticsSummary,
  type StatusCount,
  type TrackCount,
  type ResumeVersionPerformance,
  type SourcePerformance,
  type FunnelStep,
  type UpcomingData,
} from "@/lib/api";
import { APPLICATION_STATUS_CHART_COLORS, APPLICATION_STATUS_LABELS, formatTrackLabel } from "@/lib/domain/applications";
import { BarChart2, Activity, MessageCircleReply, Award, Bell } from "lucide-react";

const TRACK_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#ec4899", "#06b6d4", "#f59e0b"];

export default async function AnalyticsPage() {
  const [
    summaryResult,
    byStatusResult,
    byTrackResult,
    byResumeVersionResult,
    sourcePerformanceResult,
    funnelResult,
    upcomingResult,
  ] = await Promise.allSettled([
    getAnalyticsSummary(),
    getAnalyticsByStatus(),
    getAnalyticsByTrack(),
    getAnalyticsByResumeVersion(),
    getAnalyticsSourcePerformance(),
    getAnalyticsFunnel(),
    getAnalyticsUpcoming(),
  ]);

  const summary: AnalyticsSummary =
    summaryResult.status === "fulfilled"
      ? summaryResult.value
      : { total: 0, active: 0, responded: 0, offers: 0, response_rate: 0, offer_rate: 0, pending_reminders: 0 };

  const byStatus: StatusCount[]   = byStatusResult.status === "fulfilled" ? byStatusResult.value : [];
  const byTrack: TrackCount[]     = byTrackResult.status === "fulfilled" ? byTrackResult.value : [];
  const byResumeVersion: ResumeVersionPerformance[] = byResumeVersionResult.status === "fulfilled" ? byResumeVersionResult.value : [];
  const sourcePerformance: SourcePerformance[] = sourcePerformanceResult.status === "fulfilled" ? sourcePerformanceResult.value : [];
  const funnel: FunnelStep[]      = funnelResult.status === "fulfilled" ? funnelResult.value : [];
  const upcoming: UpcomingData    = upcomingResult.status === "fulfilled" ? upcomingResult.value : { interviews: [], reminders: [] };

  const maxStatusCount = Math.max(...byStatus.map((s) => s.count), 1);
  const maxTrackCount  = Math.max(...byTrack.map((t) => t.count), 1);
  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">Application funnel and performance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={summary.total} icon={BarChart2} />
        <StatCard label="Active" value={summary.active} icon={Activity} accent="blue" />
        <StatCard
          label="Heard Back"
          value={`${summary.responded}/${summary.total}`}
          subtitle={`${Math.round(summary.response_rate)}% of total apps`}
          icon={MessageCircleReply}
          accent="purple"
        />
        <StatCard label="Offer Rate" value={`${Math.round(summary.offer_rate)}%`} icon={Award} accent="green" />
        <StatCard label="Reminders" value={summary.pending_reminders} icon={Bell} accent="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="By Status">
          {byStatus.length === 0 ? (
            <p className="text-sm text-neutral-400">No data</p>
          ) : (
            byStatus.map((s) => (
              <Bar
                key={s.status}
                label={APPLICATION_STATUS_LABELS[s.status] ?? s.status.replace(/_/g, " ")}
                value={s.count}
                max={maxStatusCount}
                color={APPLICATION_STATUS_CHART_COLORS[s.status] ?? "#a3a3a3"}
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="By Role Track">
          {byTrack.length === 0 ? (
            <p className="text-sm text-neutral-400">No data</p>
          ) : (
            byTrack.map((t, i) => (
              <Bar
                key={t.track}
                label={formatTrackLabel(t.track)}
                value={t.count}
                max={maxTrackCount}
                color={TRACK_COLORS[i % TRACK_COLORS.length]}
              />
            ))
          )}
        </ChartCard>
      </div>

      <ChartCard title="Application Funnel">
        {funnel.length === 0 ? (
          <p className="text-sm text-neutral-400">No data</p>
        ) : (
          <div className="space-y-2">
            {funnel.map((step) => (
              <Bar
                key={step.stage}
                label={APPLICATION_STATUS_LABELS[step.stage] ?? step.stage.replace(/_/g, " ")}
                value={step.count}
                max={maxFunnelCount}
                color={APPLICATION_STATUS_CHART_COLORS[step.stage] ?? "#a3a3a3"}
              />
            ))}
          </div>
        )}
      </ChartCard>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Resume Version Performance</h2>
        {byResumeVersion.length === 0 ? (
          <p className="text-sm text-neutral-400">No resume versions found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3 text-right">Apps</th>
                  <th className="px-4 py-3 text-right">Responses</th>
                  <th className="px-4 py-3 text-right">Interviews</th>
                  <th className="px-4 py-3 text-right">Offers</th>
                  <th className="px-4 py-3 text-right">Resp. Rate</th>
                  <th className="px-4 py-3 text-right">Offer Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {byResumeVersion.map((rv) => (
                  <tr key={rv.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{rv.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{formatTrackLabel(rv.track)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">{rv.applications}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{rv.responses}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{rv.interviews}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{rv.offers}</td>
                    <td className="px-4 py-3 text-right">
                      <RateCell value={Math.round(rv.response_rate)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RateCell value={Math.round(rv.offer_rate)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Source Performance</h2>
        {sourcePerformance.length === 0 ? (
          <p className="text-sm text-neutral-400">No source data found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Apps</th>
                  <th className="px-4 py-3 text-right">Responses</th>
                  <th className="px-4 py-3 text-right">Offers</th>
                  <th className="px-4 py-3 text-right">Resp. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sourcePerformance.map((sp) => (
                  <tr key={sp.source} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900 capitalize">{sp.source}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{sp.applications}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{sp.responses}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{sp.offers}</td>
                    <td className="px-4 py-3 text-right">
                      <RateCell value={Math.round(sp.response_rate)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ExportSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Upcoming Interviews</h2>
          {upcoming.interviews.length === 0 ? (
            <p className="text-sm text-neutral-400">No upcoming interviews.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
              {upcoming.interviews.map((iv) => (
                <li key={iv.id} className="px-4 py-3.5">
                  <p className="text-sm font-medium text-neutral-900 capitalize">
                    {iv.round_type.replace(/_/g, " ")} — {iv.company_name}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{iv.application_title}</p>
                  {iv.scheduled_at && (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {new Date(iv.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Upcoming Reminders</h2>
          {upcoming.reminders.length === 0 ? (
            <p className="text-sm text-neutral-400">No upcoming reminders.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
              {upcoming.reminders.map((rem) => (
                <li key={rem.id} className="px-4 py-3.5">
                  <p className="text-sm font-medium text-neutral-900">{rem.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{rem.application_title}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(rem.due_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RateCell({ value }: { value: number }) {
  const color = value >= 50 ? "text-green-600" : value >= 20 ? "text-amber-600" : "text-neutral-500";
  return <span className={`text-sm font-medium ${color}`}>{value}%</span>;
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
  accent?: "neutral" | "blue" | "green" | "purple" | "orange";
}) {
  const styles = {
    neutral: { border: "border-neutral-200", icon: "text-neutral-400",  value: "text-neutral-900" },
    blue:    { border: "border-blue-100",    icon: "text-blue-500",     value: "text-blue-600"    },
    green:   { border: "border-green-100",   icon: "text-green-500",    value: "text-green-600"   },
    purple:  { border: "border-purple-100",  icon: "text-purple-500",   value: "text-purple-600"  },
    orange:  { border: "border-orange-100",  icon: "text-orange-500",   value: "text-orange-600"  },
  };
  const s = styles[accent];

  return (
    <div className={`rounded-lg border ${s.border} bg-white p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${s.icon}`} />
      </div>
      <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="px-5 py-3.5 text-sm font-semibold text-neutral-700 border-b border-neutral-100">{title}</h2>
      <div className="px-5 py-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Bar({ label, value, max, color = "#a3a3a3" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs text-neutral-500 capitalize truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-neutral-600">{value}</span>
    </div>
  );
}
