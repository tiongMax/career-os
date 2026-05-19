"use client";

import { useState } from "react";
import { compareResume, type ResumeVersion, type ResumeMatchResult } from "@/lib/api";

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
          className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a resume version…</option>
          {resumeVersions.map((rv) => (
            <option key={rv.id} value={rv.id}>
              {rv.name} ({rv.track})
            </option>
          ))}
        </select>
        <button
          onClick={handleCompare}
          disabled={!selectedId || loading}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">Match score</p>
            <span className={`text-sm font-semibold ${result.score >= 0.7 ? "text-green-600" : result.score >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
              {Math.round(result.score * 100)}%
            </span>
          </div>

          {result.matched.length > 0 && (
            <div>
              <p className="text-xs text-neutral-400 mb-1">Matched</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((kw) => (
                  <span key={kw} className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <p className="text-xs text-neutral-400 mb-1">Missing</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((kw) => (
                  <span key={kw} className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
