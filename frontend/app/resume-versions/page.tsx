import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getResumeVersions, getResumePDFUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default async function ResumeVersionsPage() {
  const resumes = await getResumeVersions().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Resume Versions</h1>
          <p className="mt-1 text-sm text-neutral-500">{resumes.length} version{resumes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/resume-versions/new"
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-400">No resume versions yet.</p>
          <Link
            href="/resume-versions/new"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add your first resume
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {groupByTrack(resumes).map(({ track, items }) => (
            <div key={track}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-neutral-700 capitalize">{track}</h2>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/resume-versions/${r.id}/edit`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-neutral-800 hover:text-neutral-600">{r.name}</h3>
                      </Link>
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
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-neutral-400">Updated {formatDate(r.updated_at)}</p>
                      {r.has_pdf && (
                        <a
                          href={getResumePDFUrl(r.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TRACK_ORDER = ["backend", "ai", "quant", "general"];

function groupByTrack(resumes: Awaited<ReturnType<typeof getResumeVersions>>) {
  const map = new Map<string, typeof resumes>();
  for (const r of resumes) {
    const group = map.get(r.track) ?? [];
    group.push(r);
    map.set(r.track, group);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ai = TRACK_ORDER.indexOf(a);
      const bi = TRACK_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([track, items]) => ({ track, items }));
}
