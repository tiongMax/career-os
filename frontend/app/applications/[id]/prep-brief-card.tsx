"use client";

import { useState } from "react";
import { generatePrepBrief, type PrepBrief } from "@/lib/api";

export function PrepBriefCard({ applicationId }: { applicationId: string }) {
  const [brief, setBrief] = useState<PrepBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generatePrepBrief(applicationId);
      setBrief(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }

  if (!brief) {
    return (
      <div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating…" : "Generate Prep Brief"}
        </button>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-neutral-400 mb-1">Role Summary</p>
        <p className="text-sm text-neutral-700">{brief.role_summary}</p>
      </div>

      {brief.focus_areas.length > 0 && (
        <div>
          <p className="text-xs text-neutral-400 mb-1.5">Focus Areas</p>
          <ul className="space-y-1">
            {brief.focus_areas.map((area) => (
              <li key={area} className="flex items-start gap-1.5 text-sm text-neutral-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.key_gaps.length > 0 && (
        <div>
          <p className="text-xs text-neutral-400 mb-1.5">Skill Gaps to Address</p>
          <div className="flex flex-wrap gap-1.5">
            {brief.key_gaps.map((gap) => (
              <span key={gap} className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.talking_points.length > 0 && (
        <div>
          <p className="text-xs text-neutral-400 mb-1.5">Talking Points</p>
          <ul className="space-y-1">
            {brief.talking_points.map((point) => (
              <li key={point} className="flex items-start gap-1.5 text-sm text-neutral-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-xs text-neutral-400 hover:text-neutral-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
