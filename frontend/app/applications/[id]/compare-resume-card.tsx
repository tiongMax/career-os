"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { compareResume, type ResumeVersion, type ResumeMatchResult } from "@/lib/api";
import { formatTrackLabel } from "@/lib/domain/applications";

interface Props {
  jdId: string;
  resumeVersions: ResumeVersion[];
}

export function CompareResumeCard({ jdId, resumeVersions }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<ResumeMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await compareResume(jdId, selectedId);
      setResult(data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message.replace(/^API \d+:\s*/, "") || "Could not compare this resume.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-medium text-muted-foreground">
          Resume version
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
          className="mt-1.5 min-h-10 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a resume version…</option>
          {resumeVersions.map((rv) => (
            <option key={rv.id} value={rv.id}>
              {rv.name} ({formatTrackLabel(rv.track)})
            </option>
          ))}
        </select>
        </label>
        <Button
          onClick={handleCompare}
          disabled={!selectedId || loading}
          size="sm"
        >
          {loading && <Loader2 aria-hidden="true" className="animate-spin" />}
          {loading ? "Comparing…" : "Compare"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Keyword fit</p>
            <span className="text-sm font-semibold text-primary">
              {Math.round(result.score * 100)}%
            </span>
          </div>

          {result.matched.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Strong matches</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((kw) => (
                  <span key={kw} className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Gaps to review</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((kw) => (
                  <span key={kw} className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            This is a keyword-based guide, not a hiring prediction.
          </p>
        </div>
      )}
    </div>
  );
}
