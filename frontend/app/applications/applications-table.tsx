"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react";
import type { Application } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  APPLICATION_STATUS_OPTIONS,
  APPLICATION_STATUS_ORDER,
  TRACK_BADGE_CLASSES,
} from "@/lib/domain/applications";

const DATE_OPTIONS = [
  { value: "today",   label: "Today" },
  { value: "7d",      label: "Last 7 days" },
  { value: "30d",     label: "Last 30 days" },
  { value: "90d",     label: "Last 3 months" },
  { value: "year",    label: "This year" },
];

type SortCol = "title" | "company" | "track" | "status" | "applied";
type SortDir = "asc" | "desc";

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function dateThreshold(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d":   return new Date(now.getTime() - 7  * 86400_000);
    case "30d":  return new Date(now.getTime() - 30 * 86400_000);
    case "90d":  return new Date(now.getTime() - 90 * 86400_000);
    case "year": return new Date(now.getFullYear(), 0, 1);
    default:     return new Date(0);
  }
}

interface Props {
  applications: Application[];
  companyMap: Record<string, string>;
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-neutral-700" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-neutral-700" />;
}

export function ApplicationsTable({ applications, companyMap }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  const isPending = search !== debouncedSearch;
  const [sortCol, setSortCol] = useState<SortCol>("applied");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allTracks = useMemo(() => {
    return [...new Set(applications.map((a) => a.role_track).filter(Boolean))].sort();
  }, [applications]);

  const allCompanies = useMemo(() => {
    const ids = [...new Set(applications.map((a) => a.company_id))];
    return ids
      .map((id) => ({ id, name: companyMap[id] ?? "" }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, companyMap]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const toggleTrack = (v: string) =>
    setTrackFilter((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleStatus = (v: string) =>
    setStatusFilter((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleCompany = (v: string) =>
    setCompanyFilter((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const filtered = useMemo(() => {
    let list = applications;

    if (debouncedSearch.trim()) {
      list = list.filter((a) => fuzzyMatch(debouncedSearch.trim(), a.title));
    }

    if (trackFilter.length > 0)
      list = list.filter((a) => trackFilter.includes(a.role_track));

    if (statusFilter.length > 0)
      list = list.filter((a) => statusFilter.includes(a.status));

    if (companyFilter.length > 0)
      list = list.filter((a) => companyFilter.includes(a.company_id));

    if (dateFilter) {
      const threshold = dateThreshold(dateFilter);
      list = list.filter((a) => {
        if (!a.applied_at) return false;
        return new Date(a.applied_at) >= threshold;
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "company":
          cmp = (companyMap[a.company_id] ?? "").localeCompare(companyMap[b.company_id] ?? "");
          break;
        case "track":
          cmp = a.role_track.localeCompare(b.role_track);
          break;
        case "status":
          cmp = APPLICATION_STATUS_ORDER.indexOf(a.status) - APPLICATION_STATUS_ORDER.indexOf(b.status);
          break;
        case "applied": {
          const da = new Date(a.applied_at ?? a.created_at).getTime();
          const db = new Date(b.applied_at ?? b.created_at).getTime();
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [applications, companyMap, debouncedSearch, trackFilter, statusFilter, companyFilter, dateFilter, sortCol, sortDir]);

  const hasFilters = search.trim() || trackFilter.length > 0 || statusFilter.length > 0 || companyFilter.length > 0 || dateFilter;

  const clearAll = () => {
    setSearch("");
    setTrackFilter([]);
    setStatusFilter([]);
    setCompanyFilter([]);
    setDateFilter("");
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Applications</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {filtered.length !== applications.length
              ? `${filtered.length} of ${applications.length} total`
              : `${applications.length} total`}
          </p>
        </div>
        <Link
          href="/applications/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors whitespace-nowrap"
        >
          + New Application
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search roles..."
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
        <TrackFilter tracks={allTracks} selected={trackFilter} onToggle={toggleTrack} onClear={() => setTrackFilter([])} />
        <StatusFilter selected={statusFilter} onToggle={toggleStatus} onClear={() => setStatusFilter([])} />
        <DateFilter selected={dateFilter} onChange={setDateFilter} />

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
          <p className="text-sm font-medium text-neutral-500">No applications match your filters</p>
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
                    { col: "title"   as SortCol, label: "Role" },
                    { col: "company" as SortCol, label: "Company" },
                    { col: "track"   as SortCol, label: "Track" },
                    { col: "status"  as SortCol, label: "Status" },
                    { col: "applied" as SortCol, label: "Applied" },
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
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/applications/${app.id}`}
                      className="font-medium text-neutral-800 hover:text-blue-600 transition-colors"
                    >
                      {app.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500">
                    {companyMap[app.company_id] ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TRACK_BADGE_CLASSES[app.role_track] ?? "bg-neutral-100 text-neutral-600"}`}>
                      {app.role_track}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-neutral-400">
                    {formatRelative(app.applied_at ?? app.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Shared checkbox row ───────────────────────────────────────────────────────

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

// ── Company filter ────────────────────────────────────────────────────────────

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

// ── Track filter ──────────────────────────────────────────────────────────────

function TrackFilter({
  tracks,
  selected,
  onToggle,
  onClear,
}: {
  tracks: string[];
  selected: string[];
  onToggle: (t: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? "Track" : `Track (${selected.length})`;

  return (
    <div className="relative">
      <FilterButton label={label} active={selected.length > 0} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {selected.length > 0 && (
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 border-b border-neutral-100 mb-1"
              >
                <X className="w-3 h-3" /> Clear track filter
              </button>
            )}
            {tracks.map((track) => (
              <CheckRow key={track} checked={selected.includes(track)} label={track} onClick={() => onToggle(track)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Status filter ─────────────────────────────────────────────────────────────

function StatusFilter({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (s: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selected.length === 0 ? "Status" : `Status (${selected.length})`;

  return (
    <div className="relative">
      <FilterButton label={label} active={selected.length > 0} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[160px]">
            {selected.length > 0 && (
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50 border-b border-neutral-100 mb-1"
              >
                <X className="w-3 h-3" /> Clear status filter
              </button>
            )}
            {APPLICATION_STATUS_OPTIONS.map(({ value, label: optLabel }) => (
              <CheckRow key={value} checked={selected.includes(value)} label={optLabel} onClick={() => onToggle(value)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Date filter ───────────────────────────────────────────────────────────────

function DateFilter({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = DATE_OPTIONS.find((o) => o.value === selected)?.label;
  const label = activeLabel ?? "Applied";

  return (
    <div className="relative">
      <FilterButton label={label} active={!!selected} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Backdrop onClose={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-37.5">
            {selected && (
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50"
              >
                <X className="w-3 h-3" /> Clear date filter
              </button>
            )}
            {DATE_OPTIONS.map(({ value, label: optLabel }) => (
              <button
                key={value}
                onClick={() => { onChange(value); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-neutral-50 ${selected === value ? "font-medium text-neutral-900" : "text-neutral-700"}`}
              >
                {selected === value && (
                  <svg className="w-3 h-3 text-neutral-900 shrink-0" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className={selected === value ? "" : "ml-5"}>{optLabel}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
