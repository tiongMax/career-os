"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { retryReminder } from "@/lib/api";

export function RetryButton({ reminderId }: { reminderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await retryReminder(reminderId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Retrying…" : "Retry"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
