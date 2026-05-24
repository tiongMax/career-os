"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, X } from "lucide-react";
import type { Contact } from "@/lib/api";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

const RELATIONSHIP_BADGE: Record<string, string> = {
  recruiter:      "bg-blue-50 text-blue-700",
  referral:       "bg-green-50 text-green-700",
  hiring_manager: "bg-purple-50 text-purple-700",
  interviewer:    "bg-orange-50 text-orange-700",
  connection:     "bg-neutral-100 text-neutral-600",
};

const RELATIONSHIP_OPTIONS = [
  { value: "recruiter",      label: "Recruiter" },
  { value: "referral",       label: "Referral" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "interviewer",    label: "Interviewer" },
  { value: "connection",     label: "Connection" },
];

type SortCol = "name" | "role" | "company" | "relationship";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-neutral-700" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-neutral-700" />;
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface Props {
  contacts: Contact[];
  companyMap: Map<string, string>;
}

function CheckRow({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-neutral-50"
    >
      <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
      }`}
    >
      {label}
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-10" onClick={onClose} />;
}

function CompanyFilter({
  companies,
  selected,
  onToggle,
  onClear,
}: {
  companies: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visible = query.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : companies;

  const label = selected.length === 0 ? "Company" : `Company (${selected.length})`;

  return (
    <div className="relative">
      <FilterButton label={label} active={selected.length > 0} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Backdrop onClose={() => { setOpen(false); setQuery(""); }} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg w-52">
            <div className="p-2 border-b border-neutral-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search companies..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-xs rounded border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 border-b border-neutral-100"
              >
                <X className="w-3 h-3" /> Clear company filter
              </button>
            )}
            <div className="py-1 max-h-52 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-3 py-2 text-xs text-neutral-400">No results</p>
              ) : (
                visible.map((c) => (
                  <CheckRow key={c.id} checked={selected.includes(c.id)} label={c.name} onClick={() => onToggle(c.id)} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RelationshipFilter({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? "Relationship" : `Relationship (${selected.length})`;

  return (
    <div className="relative">
      <FilterButton label={label} active={selected.length > 0} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-42.5">
            {selected.length > 0 && (
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 border-b border-neutral-100 mb-1"
              >
                <X className="w-3 h-3" /> Clear relationship filter
              </button>
            )}
            {RELATIONSHIP_OPTIONS.map(({ value, label: optLabel }) => (
              <CheckRow key={value} checked={selected.includes(value)} label={optLabel} onClick={() => onToggle(value)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ContactsTable({ contacts, companyMap }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [relationshipFilter, setRelationshipFilter] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  const isPending = search !== debouncedSearch;

  const allCompanies = useMemo(() => {
    const ids = [...new Set(contacts.map((c) => c.company_id))];
    return ids
      .map((id) => ({ id, name: companyMap.get(id) ?? "" }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, companyMap]);

  const toggleCompany = (v: string) =>
    setCompanyFilter((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleRelationship = (v: string) =>
    setRelationshipFilter((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const filtered = useMemo(() => {
    let list = contacts;

    if (debouncedSearch.trim()) {
      list = list.filter((c) => fuzzyMatch(debouncedSearch.trim(), c.name));
    }

    if (companyFilter.length > 0)
      list = list.filter((c) => companyFilter.includes(c.company_id));

    if (relationshipFilter.length > 0)
      list = list.filter((c) => c.relationship && relationshipFilter.includes(c.relationship));

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":         cmp = a.name.localeCompare(b.name); break;
        case "role":         cmp = (a.role ?? "").localeCompare(b.role ?? ""); break;
        case "company":      cmp = (companyMap.get(a.company_id) ?? "").localeCompare(companyMap.get(b.company_id) ?? ""); break;
        case "relationship": cmp = (a.relationship ?? "").localeCompare(b.relationship ?? ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, companyMap, debouncedSearch, companyFilter, relationshipFilter, sortCol, sortDir]);

  const hasFilters = search.trim() || companyFilter.length > 0 || relationshipFilter.length > 0;

  const clearAll = () => {
    setSearch("");
    setCompanyFilter([]);
    setRelationshipFilter([]);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Contacts</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {filtered.length !== contacts.length
              ? `${filtered.length} of ${contacts.length} total`
              : `${contacts.length} total`}
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors whitespace-nowrap"
        >
          + New Contact
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <CompanyFilter companies={allCompanies} selected={companyFilter} onToggle={toggleCompany} onClear={() => setCompanyFilter([])} />
        <RelationshipFilter selected={relationshipFilter} onToggle={toggleRelationship} onClear={() => setRelationshipFilter([])} />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="animate-fade-in flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 rounded-md border border-neutral-200 hover:border-neutral-300 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-neutral-500">No contacts match your filters</p>
          <button onClick={clearAll} className="mt-3 text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className={`rounded-lg border border-neutral-200 bg-white overflow-hidden transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                {(
                  [
                    { col: "name"         as SortCol, label: "Name" },
                    { col: "role"         as SortCol, label: "Role" },
                    { col: "company"      as SortCol, label: "Company" },
                  ] as const
                ).map(({ col, label }) => (
                  <th key={col} className="px-5 py-3 text-left">
                    <button
                      onClick={() => handleSort(col)}
                      className="flex items-center text-xs font-medium text-neutral-500 uppercase tracking-wide hover:text-neutral-800 transition-colors"
                    >
                      {label}
                      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                    </button>
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left">
                  <button
                    onClick={() => handleSort("relationship")}
                    className="flex items-center text-xs font-medium text-neutral-500 uppercase tracking-wide hover:text-neutral-800 transition-colors"
                  >
                    Relationship
                    <SortIcon col="relationship" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((contact) => {
                const initials = contact.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                const colorClass = AVATAR_COLORS[contact.name.charCodeAt(0) % AVATAR_COLORS.length];
                return (
                  <tr key={contact.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/contacts/${contact.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${colorClass}`}>
                          {initials}
                        </div>
                        <span className="font-medium text-neutral-800 hover:text-blue-600 transition-colors">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">{contact.role ?? "—"}</td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {companyMap.get(contact.company_id) ?? "—"}
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline text-xs">
                          {contact.email}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.relationship ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${RELATIONSHIP_BADGE[contact.relationship] ?? "bg-neutral-100 text-neutral-600"}`}>
                          {contact.relationship.replace(/_/g, " ")}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
