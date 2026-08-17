"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PortalPassword({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate font-mono text-neutral-800">
        {visible ? value : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
