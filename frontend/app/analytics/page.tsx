import { getApplications } from "@/lib/api";

const STATUSES = ["saved", "applied", "recruiter_screen", "technical_screen", "onsite", "offer", "rejected", "withdrawn"];
const TRACKS = ["backend", "ai", "quant", "general", "fullstack", "platform"];

export default async function AnalyticsPage() {
  const applications = await getApplications().catch(() => []);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const byTrack = Object.fromEntries(TRACKS.map((t) => [t, 0]));

  for (const app of applications) {
    if (app.status in byStatus) byStatus[app.status]++;
    if (app.role_track in byTrack) byTrack[app.role_track]++;
  }

  const total = applications.length;
  const responded = applications.filter((a) =>
    ["recruiter_screen", "technical_screen", "onsite", "offer", "rejected"].includes(a.status)
  ).length;
  const offers = applications.filter((a) => a.status === "offer").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">Application funnel and performance</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Response Rate" value={total > 0 ? `${Math.round((responded / total) * 100)}%` : "—"} />
        <StatCard label="Offer Rate" value={total > 0 ? `${Math.round((offers / total) * 100)}%` : "—"} />
        <StatCard label="Total Applications" value={total} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="By Status">
          {STATUSES.map((s) => (
            <Bar key={s} label={s.replace("_", " ")} value={byStatus[s]} max={Math.max(...Object.values(byStatus), 1)} />
          ))}
        </ChartCard>

        <ChartCard title="By Track">
          {TRACKS.map((t) => (
            <Bar key={t} label={t} value={byTrack[t]} max={Math.max(...Object.values(byTrack), 1)} />
          ))}
        </ChartCard>
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
        Detailed analytics endpoints (by-resume-version, source-performance, funnel) are coming in Day 5.
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="px-5 py-3.5 text-sm font-medium text-neutral-700 border-b border-neutral-100 capitalize">{title}</h2>
      <div className="px-5 py-4 space-y-2">{children}</div>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-neutral-500 capitalize truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full bg-neutral-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs text-neutral-400">{value}</span>
    </div>
  );
}
