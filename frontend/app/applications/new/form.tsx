"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Check, Building2, Plus, ChevronDown, Layers, Briefcase, MapPin, Globe, FileText } from "lucide-react";
import type { Company, ResumeVersion, RoleTrack } from "@/lib/api";
import { createRoleTrack } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

interface Option {
  value: string;
  label: string;
  meta?: string;
  dot?: string;
}


const STATUS_OPTIONS: Option[] = [
  { value: "saved",            label: "Saved",            dot: "bg-slate-400"   },
  { value: "applied",          label: "Applied",          dot: "bg-blue-500"    },
  { value: "recruiter_screen", label: "Recruiter Screen", dot: "bg-purple-500"  },
  { value: "technical_screen", label: "Technical Screen", dot: "bg-indigo-500"  },
  { value: "onsite",           label: "Onsite",           dot: "bg-orange-500"  },
  { value: "offer",            label: "Offer",            dot: "bg-green-500"   },
  { value: "rejected",         label: "Rejected",         dot: "bg-red-500"     },
  { value: "withdrawn",        label: "Withdrawn",        dot: "bg-neutral-400" },
];

const EMPLOYMENT_OPTIONS: Option[] = [
  { value: "full_time",  label: "Full-time"  },
  { value: "internship", label: "Internship" },
  { value: "part_time",  label: "Part-time"  },
  { value: "contract",   label: "Contract"   },
];

const SOURCE_OPTIONS: Option[] = [
  "LinkedIn", "Referral", "Company Website", "Indeed",
  "Glassdoor", "Wellfound", "Handshake", "Recruiter",
  "Job Fair", "Cold Outreach",
].map((s) => ({ value: s, label: s }));

const LOCATION_OPTIONS: Option[] = [
  "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA",
  "Austin, TX", "Boston, MA", "Chicago, IL", "Los Angeles, CA",
  "Denver, CO", "Miami, FL", "Washington, DC", "Pittsburgh, PA",
  "Portland, OR", "Atlanta, GA",
].map((loc) => ({ value: loc, label: loc }));

export function NewApplicationForm({
  companies,
  resumes,
  tracks,
}: {
  companies: Company[];
  resumes: ResumeVersion[];
  tracks: RoleTrack[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const trackOptions: Option[] = tracks.map((t) => ({
    value: t.name,
    label: t.name.charAt(0).toUpperCase() + t.name.slice(1),
  }));

  const resumeOptions: Option[] = resumes.map((r) => ({
    value: r.id,
    label: r.name,
    meta: r.track,
  }));

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

      const track = (fd.get("role_track") as string).trim().toLowerCase();
      if (!track) throw new Error("Track is required");

      const isKnownTrack = tracks.some((t) => t.name === track);
      if (!isKnownTrack) {
        await createRoleTrack(track).catch((err) => {
          if (!String(err).includes("409")) throw err;
        });
      }

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
            <OptionCombobox
              name="role_track"
              options={trackOptions}
              placeholder="Select track…"
              allowCustom
              required
              icon={Layers}
            />
          </Field>
          <Field label="Status">
            <OptionCombobox
              name="status"
              options={STATUS_OPTIONS}
              placeholder="Select status…"
              required
              onSelect={setStatus}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment Type">
            <OptionCombobox
              name="employment_type"
              options={EMPLOYMENT_OPTIONS}
              placeholder="Select type…"
              icon={Briefcase}
            />
          </Field>
          {status && status !== "saved" && (
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
          <OptionCombobox
            name="resume_version_id"
            options={resumeOptions}
            placeholder="Search resumes…"
            icon={FileText}
          />
        </Field>
      </FormSection>

      {/* Details */}
      <FormSection title="Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <OptionCombobox
              name="source"
              options={SOURCE_OPTIONS}
              placeholder="LinkedIn, referral…"
              allowCustom
              icon={Globe}
            />
          </Field>
          <Field label="Location">
            <OptionCombobox
              name="location"
              options={LOCATION_OPTIONS}
              placeholder="San Francisco, Remote…"
              allowCustom
              icon={MapPin}
            />
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
        <Link
          href="/applications"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

// ─── OptionCombobox ───────────────────────────────────────────────────────────
// For fixed option lists (Track, Status, Employment Type, Resume Version).
// required=true  → starts with defaultOption selected, no clear button
// allowCustom=true → lets the user type a value not in the list (for Track)

function OptionCombobox({
  name,
  options,
  placeholder = "Search…",
  defaultOption,
  required = false,
  allowCustom = false,
  onSelect,
  icon: Icon,
}: {
  name: string;
  options: Option[];
  placeholder?: string;
  defaultOption?: Option;
  required?: boolean;
  allowCustom?: boolean;
  onSelect?: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(defaultOption ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const hasExactMatch = options.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase()
  );
  const showCreate = allowCustom && query.trim().length > 0 && !hasExactMatch && !selected;
  const showDropdown = open && (filtered.length > 0 || showCreate);

  function pick(option: Option) {
    setSelected(option);
    setQuery("");
    setOpen(false);
    onSelect?.(option.value);
  }

  const pickCustom = useCallback((raw: string) => {
    const opt: Option = { value: raw, label: raw };
    setSelected(opt);
    setQuery("");
    setOpen(false);
    onSelect?.(opt.value);
  }, [onSelect]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selected) {
          if (allowCustom && query.trim()) {
            pickCustom(query.trim());
          } else {
            setQuery("");
          }
        }
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [selected, query, allowCustom, pickCustom]);

  function clear() {
    setSelected(null);
    setQuery("");
    setOpen(true);
    onSelect?.("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.value ?? ""} />

      {selected ? (
        /* ── Selected pill ── */
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-2.5 rounded-md border border-neutral-900 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-900"
        >
          {selected.dot && (
            <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot} group-hover:opacity-70`} />
          )}
          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />
          <span className="flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-white">
            {selected.label}
          </span>
          {selected.meta && (
            <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-300">{selected.meta}</span>
          )}
          {!required ? (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="ml-auto shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:hover:bg-neutral-700 group-hover:text-neutral-300"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
          )}
        </button>
      ) : open ? (
        /* ── Search input (open) ── */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
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
      ) : (
        /* ── Placeholder button (closed, nothing selected) ── */
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-left text-sm font-medium text-neutral-400 hover:border-neutral-400 hover:text-neutral-500 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate">{placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((o) => {
              const isActive = selected?.value === o.value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                    className={`group flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer
                      ${isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
                      }`}
                  >
                    {o.dot && (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${o.dot}`} />
                    )}
                    {isActive
                      ? <Check className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
                      : Icon
                        ? <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
                        : <span className="h-3.5 w-3.5 shrink-0" />
                    }
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.meta && (
                      <span className={`shrink-0 text-xs ${isActive ? "text-neutral-300" : "text-neutral-400 group-hover:text-neutral-300"}`}>
                        {o.meta}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {showCreate && (
            <div className="border-t border-neutral-100">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pickCustom(query.trim()); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                  <Plus className="h-2.5 w-2.5" />
                </div>
                <span>Use <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span></span>
              </button>
            </div>
          )}

          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-3 text-sm text-neutral-400">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CompanyCombobox ──────────────────────────────────────────────────────────

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
  const showDropdown = open && !selected && (filtered.length > 0 || showCreate);

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

  return (
    <div ref={containerRef} className="relative">
      {selected?.type === "existing" && (
        <input type="hidden" name="company_id" value={selected.id} />
      )}
      {selected?.type === "new" && (
        <input type="hidden" name="new_company_name" value={selected.name} />
      )}

      {selected ? (
        <button
          type="button"
          onClick={clear}
          className="group flex w-full items-center gap-2.5 rounded-md border border-neutral-900 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-900"
        >
          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />
          <span className="flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-white">
            {selected.name}
          </span>
          {selected.type === "new" && (
            <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-300">new</span>
          )}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="ml-auto shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:hover:bg-neutral-700 group-hover:text-neutral-300"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
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
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
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

// ─── Layout helpers ───────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white">
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
  "w-full rounded-md border border-neutral-900 bg-white px-3 py-2 text-sm font-medium text-neutral-800 placeholder-shown:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";
