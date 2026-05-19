import { getCompanies, getResumeVersions } from "@/lib/api";
import { NewApplicationForm } from "./form";

export default async function NewApplicationPage() {
  const [companies, resumes] = await Promise.all([
    getCompanies().catch(() => []),
    getResumeVersions().catch(() => []),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">New Application</h1>
        <p className="mt-1 text-sm text-neutral-500">Track a new job application</p>
      </div>
      <NewApplicationForm companies={companies} resumes={resumes} />
    </div>
  );
}
