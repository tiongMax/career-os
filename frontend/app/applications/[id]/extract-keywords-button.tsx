"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractKeywords } from "@/lib/api";

export function ExtractKeywordsButton({ jdId }: { jdId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await extractKeywords(jdId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract keywords");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Extracting…" : "Extract Keywords"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
