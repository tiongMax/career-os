"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company, ResumeVersion } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const PRESET_TRACKS = ["backend", "ai", "quant", "general", "fullstack", "platform"];

const STATUSES = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "recruiter_screen", label: "Recruiter Screen" },
  { value: "technical_screen", label: "Technical Screen" },
  { value: "onsite", label: "Onsite" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const EMPLOYMENT_TYPES = [
  { value: "", label: "Not specified" },
  { value: "full_time", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const LOCATION_SUGGESTIONS = [
  "Remote",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Chicago, IL",
  "Los Angeles, CA",
  "Denver, CO",
  "Miami, FL",
  "Washington, DC",
  "Pittsburgh, PA",
  "Portland, OR",
  "Atlanta, GA",
];

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
  const [isNewCompany, setIsNewCompany] = useState(companies.length === 0);
  const [isCustomTrack, setIsCustomTrack] = useState(false);
  const [status, setStatus] = useState("saved");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    try {
      let companyId: string;
      if (isNewCompany) {
        const name = (fd.get("new_company_name") as string).trim();
        if (!name) throw new Error("Company name is required");
        const res = await fetch(`${BASE}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Failed to create company: ${text}`);
        }
        const company = await res.json();
        companyId = company.id;
      } else {
        companyId = fd.get("company_id") as string;
        if (!companyId) throw new Error("Please select a company");
      }

      const track = isCustomTrack
        ? (fd.get("custom_track") as string).trim().toLowerCase()
        : (fd.get("role_track") as string);
      if (!track) throw new Error("Track is required");

      const body: Record<string, unknown> = {
        company_id: companyId,
        title: fd.get("title"),
        role_track: track,
        status: fd.get("status") || "saved",
      };
      if (fd.get("resume_version_id")) body.resume_version_id = fd.get("resume_version_id");
      if (fd.get("source")) body.source = fd.get("source");
      if (fd.get("location")) body.location = fd.get("location");
      if (fd.get("job_url")) body.job_url = fd.get("job_url");
      if (fd.get("notes")) body.notes = fd.get("notes");
      if (fd.get("employment_type")) body.employment_type = fd.get("employment_type");
      if (fd.get("applied_at")) {
        body.applied_at = new Date(fd.get("applied_at") as string).toISOString();
      }

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Position */}
      <FormSection title="Position">
        <Field label="Company" required>
          {isNewCompany ? (
            <div className="space-y-2">
              <input
                name="new_company_name"
                required
                placeholder="e.g. Google, Stripe…"
                className={inputClass}
                autoFocus
              />
              {companies.length > 0 && (
                <button type="button" onClick={() => setIsNewCompany(false)} className={linkClass}>
                  ← Select existing company
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <select name="company_id" required className={selectClass}>
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setIsNewCompany(true)} className={linkClass}>
                + Add new company
              </button>
            </div>
          )}
        </Field>

        <Field label="Role Title" required>
          <input
            name="title"
            required
            placeholder="e.g. Backend Engineer Intern"
            className={inputClass}
          />
        </Field>
      </FormSection>

      {/* Classification */}
      <FormSection title="Classification">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Track" required>
            {isCustomTrack ? (
              <div className="space-y-2">
                <input
                  name="custom_track"
                  required
                  placeholder="e.g. devrel, security…"
                  className={inputClass}
                  autoFocus
                />
                <button type="button" onClick={() => setIsCustomTrack(false)} className={linkClass}>
                  ← Use preset
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <select name="role_track" required className={selectClass}>
                  {PRESET_TRACKS.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setIsCustomTrack(true)} className={linkClass}>
                  + Custom track
                </button>
              </div>
            )}
          </Field>

          <Field label="Status">
            <select
              name="status"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment Type">
            <select name="employment_type" className={selectClass}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          {status !== "saved" && (
            <Field label="Applied Date">
              <input
                name="applied_at"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </FormSection>

      {/* Resume */}
      <FormSection title="Resume">
        <Field label="Resume Version">
          <select name="resume_version_id" className={selectClass}>
            <option value="">None</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.track})</option>
            ))}
          </select>
        </Field>
      </FormSection>

      {/* Details */}
      <FormSection title="Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <input name="source" placeholder="LinkedIn, referral, etc." className={inputClass} />
          </Field>
          <Field label="Location">
            <div>
              <input
                name="location"
                placeholder="San Francisco, Remote…"
                className={inputClass}
                list="location-suggestions"
              />
              <datalist id="location-suggestions">
                {LOCATION_SUGGESTIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </Field>
        </div>

        <Field label="Job URL">
          <input name="job_url" type="url" placeholder="https://…" className={inputClass} />
        </Field>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            placeholder="Any notes…"
            className={`${inputClass} resize-none`}
          />
        </Field>
      </FormSection>

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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <h2 className="px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50">
        {title}
      </h2>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

const selectClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

const linkClass =
  "text-xs text-neutral-400 hover:text-neutral-600 transition-colors underline-offset-2 hover:underline";
