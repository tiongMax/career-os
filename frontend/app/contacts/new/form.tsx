"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Check, Building2, Plus, ChevronDown } from "lucide-react";
import type { Company } from "@/lib/api";
import { createContact } from "@/lib/api";

const RELATIONSHIP_OPTIONS = [
  { value: "recruiter",      label: "Recruiter" },
  { value: "referral",       label: "Referral" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "interviewer",    label: "Interviewer" },
  { value: "connection",     label: "Connection" },
];

const inputClass =
  "w-full rounded-md border border-neutral-900 bg-white px-3 py-2 text-sm font-medium text-neutral-800 placeholder-shown:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

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
                    onMouseDown={(e) => { e.preventDefault(); setSelected({ type: "existing", id: c.id, name: c.name }); setOpen(false); }}
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
                onMouseDown={(e) => { e.preventDefault(); setSelected({ type: "new", name: query.trim() }); setOpen(false); }}
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

function RelationshipSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = RELATIONSHIP_OPTIONS.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="relationship" value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
          selected
            ? "border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-900 hover:text-white group"
            : "border-neutral-300 text-neutral-400 hover:border-neutral-400"
        }`}
      >
        <span className="flex-1">{selected?.label ?? "Select relationship…"}</span>
        {selected ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-lg border border-neutral-200 bg-white shadow-lg py-1 overflow-hidden">
          {RELATIONSHIP_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                value === o.value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {value === o.value && <Check className="h-3.5 w-3.5 shrink-0" />}
              {value !== o.value && <span className="h-3.5 w-3.5 shrink-0" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export function NewContactForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [relationship, setRelationship] = useState("");

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

      const name = (fd.get("name") as string).trim();
      if (!name) throw new Error("Name is required");

      const payload: Parameters<typeof createContact>[0] = { company_id: companyId, name };
      const role = (fd.get("role") as string).trim();
      const email = (fd.get("email") as string).trim();
      const linkedin = (fd.get("linkedin_url") as string).trim();
      const notes = (fd.get("notes") as string).trim();

      if (role) payload.role = role;
      if (email) payload.email = email;
      if (linkedin) payload.linkedin_url = linkedin;
      if (relationship) payload.relationship = relationship;
      if (notes) payload.notes = notes;

      await createContact(payload);
      router.push("/contacts");
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

      <FormSection title="Contact">
        <Field label="Company" required>
          <CompanyCombobox companies={companies} />
        </Field>
        <Field label="Name" required>
          <input
            name="name"
            required
            placeholder="e.g. Jane Smith"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <input
              name="role"
              placeholder="e.g. Senior Recruiter"
              className={inputClass}
            />
          </Field>
          <Field label="Relationship">
            <RelationshipSelect value={relationship} onChange={setRelationship} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Details">
        <Field label="Email">
          <input
            name="email"
            type="email"
            placeholder="jane@company.com"
            className={inputClass}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            name="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/…"
            className={inputClass}
          />
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
          {loading ? "Saving…" : "Create Contact"}
        </button>
        <Link
          href="/contacts"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
