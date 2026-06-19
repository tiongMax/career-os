"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, Plus, Search, Trash2, X } from "lucide-react";
import type { Company } from "@/lib/api";
import { deleteCompany } from "@/lib/api";

type CompanySelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

export function CompanyCombobox({
  companies,
  defaultId,
  defaultName = "",
}: {
  companies: Company[];
  defaultId?: string;
  defaultName?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CompanySelection | null>(
    defaultId ? { type: "existing", id: defaultId, name: defaultName } : null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim();
  const choices = companies.filter((company) => !removedIds.includes(company.id));
  const filtered = trimmedQuery
    ? choices.filter((company) => company.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : choices;

  const hasExactMatch = choices.some(
    (company) => company.name.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreate = trimmedQuery.length > 0 && !hasExactMatch;
  const showDropdown = open && !selected && (filtered.length > 0 || showCreate);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
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
    setError(null);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function removeChoice(company: Company) {
    setError(null);
    setDeletingId(company.id);
    try {
      await deleteCompany(company.id);
      setRemovedIds((current) => [...current, company.id]);
      if (selected?.type === "existing" && selected.id === company.id) {
        setSelected(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("409") || message.includes("23503")
          ? "This company is used elsewhere and cannot be removed."
          : "Could not remove company."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {selected?.type === "existing" && <input type="hidden" name="company_id" value={selected.id} />}
      {selected?.type === "new" && <input type="hidden" name="new_company_name" value={selected.name} />}

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
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
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
            placeholder="Search companies..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {error && (
            <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
          {filtered.length > 0 && (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map((company) => (
                <li key={company.id}>
                  <div className="group flex items-center text-sm text-neutral-700 hover:bg-neutral-900 hover:text-white transition-colors">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectExisting(company);
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
                      <span className="truncate">{company.name}</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === company.id}
                      title={`Remove ${company.name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void removeChoice(company);
                      }}
                      className="mr-2 rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 disabled:opacity-50 group-hover:opacity-100 group-hover:text-neutral-300 group-hover:hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {showCreate && (
            <div className={filtered.length > 0 ? "border-t border-neutral-100" : ""}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectNew(trimmedQuery);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                  <Plus className="h-2.5 w-2.5" />
                </div>
                <span>
                  Create <span className="font-medium">&quot;{trimmedQuery}&quot;</span>
                </span>
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
