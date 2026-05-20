import { Briefcase } from "lucide-react";
import Link from "next/link";
import { getApplications, getCompanies } from "@/lib/api";
import { ApplicationsTable } from "./applications-table";

export default async function ApplicationsPage() {
  const [applications, companies] = await Promise.all([
    getApplications().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  if (applications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Applications</h1>
            <p className="mt-1 text-sm text-neutral-500">0 total</p>
          </div>
          <Link
            href="/applications/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            + New Application
          </Link>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-20 text-center">
          <Briefcase className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No applications yet</p>
          <p className="text-xs text-neutral-400 mt-1">Start tracking your job search</p>
          <Link
            href="/applications/new"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            + New Application
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApplicationsTable applications={applications} companyMap={companyMap} />
    </div>
  );
}
