"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Check, Building2, Plus } from "lucide-react";
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
  "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA",
  "Austin, TX", "Boston, MA", "Chicago, IL", "Los Angeles, CA",
  "Denver, CO", "Miami, FL", "Washington, DC", "Pittsburgh, PA",
  "Portland, OR", "Atlanta, GA",
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
  const [isCustomTrack, setIsCustomTrack] = useState(false);
  const [status, setStatus] = useState("saved");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    try {
      const existingCompanyId = fd.get("company_id") as string;
      const newCompanyName = (fd.get("new_company_name") as string)?.trim();

      if (!existingCompanyId && !newCompanyName) {
        throw new Error("Please select or create a company");
      }

      let companyId: string;
      if (newCompanyName) {
        const res = await fetch(`${BASE}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCompanyName }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Failed to create company: ${text}`);
        }
        const company = await res.json();
        companyId = company.id;
      } else {
        companyId = existingCompanyId;
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
          <CompanyCombobox companies={companies} />
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

type CompanySelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

function CompanyCombobox({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CompanySelection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? companies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : companies;

  const hasExactMatch = companies.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate = query.trim().length > 0 && !hasExactMatch;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectExisting(company: Company) {
    setSelected({ type: "existing", id: company.id, name: company.name });
    setQuery("");
    setOpen(false);
  }

  function selectNew(name: string) {
    setSelected({ type: "new", name });
    setQuery("");
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const showDropdown = open && !selected && (filtered.length > 0 || showCreate);

  return (
    <div ref={containerRef} className="relative">
      {selected?.type === "existing" && (
        <input type="hidden" name="company_id" value={selected.id} />
      )}
      {selected?.type === "new" && (
        <input type="hidden" name="new_company_name" value={selected.name} />
      )}

      {selected ? (
        /* Selected state */
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
            {selected.type === "new"
              ? <Plus className="h-3 w-3 text-green-600" />
              : <Check className="h-3 w-3 text-green-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate">{selected.name}</p>
            <p className="text-xs text-green-600">
              {selected.type === "new" ? "New company — will be created" : "Existing company"}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-green-100 hover:text-neutral-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder="Search companies…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {/* Existing companies */}
          {filtered.length > 0 && (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectExisting(c); }}
                    className="group flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Create new option */}
          {showCreate && (
            <div className={filtered.length > 0 ? "border-t border-neutral-100" : ""}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectNew(query.trim()); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                  <Plus className="h-2.5 w-2.5" />
                </div>
                <span>Create <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span></span>
              </button>
            </div>
          )}

          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-3 text-sm text-neutral-400">No companies found</p>
          )}
        </div>
      )}
    </div>
  );
}

/* Remove overflow-hidden from FormSection so the combobox dropdown can escape the card */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="rounded-t-lg px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50">
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
