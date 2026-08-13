"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message.replace(/^API \d+:\s*/, "") ||
          "Could not build the preparation brief.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!brief) {
    return (
      <div className="rounded-control border border-dashed border-border px-4 py-5">
        <p className="mb-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Build a focused brief from the role, attached resume, contacts, and
          interview details saved here.
        </p>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {loading ? "Building brief…" : "Build interview prep"}
        </Button>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-control bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Role summary</p>
        <p className="text-sm leading-6 text-foreground">{brief.role_summary}</p>
      </div>

      {brief.focus_areas.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Focus areas</p>
          <ul className="space-y-1">
            {brief.focus_areas.map((area) => (
              <li key={area} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.key_gaps.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Gaps to prepare for</p>
          <div className="flex flex-wrap gap-1.5">
            {brief.key_gaps.map((gap) => (
              <span key={gap} className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.talking_points.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Talking points</p>
          <ul className="space-y-1">
            {brief.talking_points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading}
        variant="ghost"
        size="sm"
      >
        {loading && <Loader2 aria-hidden="true" className="animate-spin" />}
        {loading ? "Refreshing…" : "Refresh prep brief"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Generated guidance may miss context. Use it as a starting point and
        tailor it to your own experience.
      </p>
      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
