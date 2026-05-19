"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company, ResumeVersion } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const TRACKS = ["backend", "ai", "quant", "general", "fullstack", "platform"];
const STATUSES = ["saved", "applied"];

export function NewApplicationForm({
  companies,
  resumes,
}: {
  companies: Company[];
  resumes: ResumeVersion[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      company_id: fd.get("company_id"),
      title: fd.get("title"),
      role_track: fd.get("role_track"),
      status: fd.get("status") || "saved",
    };
    if (fd.get("resume_version_id")) body.resume_version_id = fd.get("resume_version_id");
    if (fd.get("source")) body.source = fd.get("source");
    if (fd.get("location")) body.location = fd.get("location");
    if (fd.get("job_url")) body.job_url = fd.get("job_url");
    if (fd.get("notes")) body.notes = fd.get("notes");

    try {
      const res = await fetch(`${BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text);
      }
      const app = await res.json();
      router.push(`/applications/${app.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-6 space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Field label="Company" required>
        <select name="company_id" required className={selectClass}>
          <option value="">Select company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Role Title" required>
        <input name="title" required placeholder="e.g. Backend Engineer Intern" className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Track" required>
          <select name="role_track" required className={selectClass}>
            {TRACKS.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select name="status" className={selectClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Resume Version">
        <select name="resume_version_id" className={selectClass}>
          <option value="">None</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.track})</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Source">
          <input name="source" placeholder="LinkedIn, referral, etc." className={inputClass} />
        </Field>
        <Field label="Location">
          <input name="location" placeholder="San Francisco, Remote…" className={inputClass} />
        </Field>
      </div>

      <Field label="Job URL">
        <input name="job_url" type="url" placeholder="https://…" className={inputClass} />
      </Field>

      <Field label="Notes">
        <textarea name="notes" rows={3} placeholder="Any notes…" className={inputClass} />
      </Field>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : "Create Application"}
        </button>
        <a
          href="/applications"
          className="rounded-md border border-neutral-200 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

const selectClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";
