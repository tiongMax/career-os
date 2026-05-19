import { getResumeVersions } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default async function ResumeVersionsPage() {
  const resumes = await getResumeVersions().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Resume Versions</h1>
        <p className="mt-1 text-sm text-neutral-500">{resumes.length} version{resumes.length !== 1 ? "s" : ""}</p>
      </div>

      {resumes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-400">No resume versions yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium text-neutral-800">{r.name}</h2>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 capitalize">
                  {r.track}
                </span>
              </div>
              {r.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.tags.map((tag) => (
                    <span key={tag} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-neutral-400">Updated {formatDate(r.updated_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
