import Link from "next/link";
import { getApplications, getCompanies } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export default async function ApplicationsPage() {
  const [applications, companies] = await Promise.all([
    getApplications().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Applications</h1>
          <p className="mt-1 text-sm text-neutral-500">{applications.length} total</p>
        </div>
        <Link
          href="/applications/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          + New Application
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-400">No applications yet.</p>
          <Link href="/applications/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Create your first one
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Company</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Track</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/applications/${app.id}`} className="font-medium text-neutral-800 hover:text-blue-600">
                      {app.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">
                    {companyMap[app.company_id] ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-neutral-400 capitalize">{app.role_track}</span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">
                    {formatDate(app.applied_at ?? app.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
