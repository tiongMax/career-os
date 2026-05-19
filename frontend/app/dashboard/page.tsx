import Link from "next/link";
import { getApplications, getAnalyticsSummary } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const [summary, applications] = await Promise.all([
    getAnalyticsSummary().catch(() => null),
    getApplications().catch(() => []),
  ]);

  const stats = {
    total: summary?.total ?? 0,
    active: summary?.active ?? 0,
    offers: summary?.offers ?? 0,
    responseRate: summary ? Math.round(summary.response_rate * 100) : 0,
    pendingReminders: summary?.pending_reminders ?? 0,
    recentApps: applications.slice(-5).reverse(),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">Your job search at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applications" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Offers" value={stats.offers} highlight />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-medium text-neutral-700">Recent Applications</h2>
            <Link href="/applications" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.recentApps.length === 0 ? (
            <p className="px-5 py-8 text-sm text-neutral-400 text-center">No applications yet</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.recentApps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{app.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{formatDate(app.created_at)}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-medium text-neutral-700">Pending Reminders</h2>
            <Link href="/reminders" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {stats.pendingReminders === 0 ? (
            <p className="px-5 py-8 text-sm text-neutral-400 text-center">No pending reminders</p>
          ) : (
            <div className="px-5 py-8 text-center">
              <span className="text-3xl font-semibold text-orange-500">{stats.pendingReminders}</span>
              <p className="text-sm text-neutral-500 mt-1">pending follow-ups</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 bg-white ${highlight ? "border-green-200" : "border-neutral-200"}`}>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${highlight ? "text-green-600" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}
