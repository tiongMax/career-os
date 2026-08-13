import Link from "next/link";
import { Plus, FileText, FileX } from "lucide-react";
import { getResumeVersions, getResumePDFUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { formatTrackLabel } from "@/lib/domain/applications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const TRACK_STYLE: Record<
  string,
  { dot: string; label: string; border: string }
> = {
  backend: {
    dot: "bg-blue-500",
    label: "bg-blue-50 text-blue-700",
    border: "border-l-blue-400",
  },
  ai: {
    dot: "bg-purple-500",
    label: "bg-purple-50 text-purple-700",
    border: "border-l-purple-400",
  },
  quant: {
    dot: "bg-amber-500",
    label: "bg-amber-50 text-amber-700",
    border: "border-l-amber-400",
  },
  general: {
    dot: "bg-neutral-400",
    label: "bg-neutral-100 text-neutral-600",
    border: "border-l-neutral-300",
  },
};

const DEFAULT_STYLE = {
  dot: "bg-neutral-400",
  label: "bg-neutral-100 text-neutral-600",
  border: "border-l-neutral-300",
};

export default async function ResumeVersionsPage() {
  const resumes = await getResumeVersions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Versions"
        description={`${resumes.length} version${resumes.length !== 1 ? "s" : ""} ready to match with the right role.`}
        actions={
          <Button asChild>
            <Link href="/resume-versions/new">
              <Plus aria-hidden="true" />
              New resume
            </Link>
          </Button>
        }
      />

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="Add your first resume"
          description="Keep tailored versions together and learn which one gets the strongest response."
          actions={
            <Button asChild>
              <Link href="/resume-versions/new">
                <Plus aria-hidden="true" />
                Add resume
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupByTrack(resumes).map(({ track, items }) => {
            const style = TRACK_STYLE[track] ?? DEFAULT_STYLE;
            return (
              <div key={track}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <h2 className="text-sm font-semibold text-neutral-700">
                    {formatTrackLabel(track)}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.label}`}
                  >
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-neutral-100" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className={`group relative rounded-lg border border-neutral-200 border-l-4 ${style.border} bg-white p-5 hover:border-neutral-300 hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/resume-versions/${r.id}/edit`}
                          className="flex-1 min-w-0"
                        >
                          <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-neutral-600 transition-colors leading-snug">
                            {r.name}
                          </h3>
                        </Link>
                        {r.has_pdf ? (
                          <a
                            href={getResumePDFUrl(r.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View PDF"
                            className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span
                            className="shrink-0 rounded-md p-1 text-neutral-200"
                            title="No PDF attached"
                          >
                            <FileText className="h-4 w-4" />
                          </span>
                        )}
                      </div>

                      {r.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {r.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-neutral-300 italic">
                          No tags
                        </p>
                      )}

                      <p className="mt-4 text-xs text-neutral-400">
                        Updated {formatDate(r.updated_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
