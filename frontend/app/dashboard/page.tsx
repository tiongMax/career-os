import Link from "next/link";
import { Briefcase, Activity, Award, TrendingUp, Bell, ArrowRight } from "lucide-react";
import { getApplications, getAnalyticsSummary, getCompanies } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const [summary, applications, companies] = await Promise.all([
    getAnalyticsSummary().catch(() => null),
    getApplications().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

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
        <StatCard label="Total" value={stats.total} icon={Briefcase} />
        <StatCard label="Active" value={stats.active} icon={Activity} accent="blue" />
        <StatCard label="Offers" value={stats.offers} icon={Award} accent="green" />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} icon={TrendingUp} accent="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-700">Recent Applications</h2>
            <Link href="/applications" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.recentApps.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Briefcase className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No applications yet</p>
              <Link href="/applications/new" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                Create your first one →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.recentApps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-neutral-800 truncate">{app.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {companyMap[app.company_id] ?? "—"} · {formatRelative(app.created_at)}
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
            <h2 className="text-sm font-semibold text-neutral-700">Pending Reminders</h2>
            <Link href="/reminders" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.pendingReminders === 0 ? (
            <div className="px-5 py-12 text-center">
              <Bell className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No pending reminders</p>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                <Bell className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-4xl font-bold text-orange-500">{stats.pendingReminders}</p>
              <p className="text-sm text-neutral-500 mt-1">pending follow-ups</p>
              <Link href="/reminders" className="mt-4 inline-block text-xs text-blue-600 hover:underline">
                View reminders →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "neutral" | "blue" | "green" | "purple";
}) {
  const styles = {
    neutral: { border: "border-neutral-200", icon: "text-neutral-400",  value: "text-neutral-900" },
    blue:    { border: "border-blue-100",    icon: "text-blue-500",     value: "text-blue-600"    },
    green:   { border: "border-green-100",   icon: "text-green-500",    value: "text-green-600"   },
    purple:  { border: "border-purple-100",  icon: "text-purple-500",   value: "text-purple-600"  },
  };
  const s = styles[accent];

  return (
    <div className={`rounded-lg border ${s.border} bg-white p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${s.icon}`} />
      </div>
      <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
    </div>
  );
}
