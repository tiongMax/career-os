"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type AriaAttributes,
  type KeyboardEvent,
} from "react";
import { Building2, Check, Plus, Search, Trash2, X } from "lucide-react";
import type { Company } from "@/lib/api";
import { deleteCompany } from "@/lib/api";

type CompanySelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string };

type CompanyComboboxProps = {
  companies: Company[];
  defaultId?: string;
  defaultName?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

export function CompanyCombobox({
  companies,
  defaultId,
  defaultName = "",
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: CompanyComboboxProps) {
  const reactId = useId().replace(/:/g, "");
  const controlId = id ?? `company-${reactId}`;
  const listboxId = `${controlId}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<CompanySelection | null>(
    defaultId ? { type: "existing", id: defaultId, name: defaultName } : null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const trimmedQuery = query.trim();
  const choices = companies.filter((company) => !removedIds.includes(company.id));
  const filtered = trimmedQuery
    ? choices.filter((company) => company.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : choices;
  const hasExactMatch = choices.some(
    (company) => company.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const showCreate = trimmedQuery.length > 0 && !hasExactMatch;
  const showDropdown = open && !selected;
  const optionCount = filtered.length + (showCreate ? 1 : 0);
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    function closeWhenFocusLeaves(e: MouseEvent | FocusEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", closeWhenFocusLeaves);
    document.addEventListener("focusin", closeWhenFocusLeaves);
    return () => {
      document.removeEventListener("mousedown", closeWhenFocusLeaves);
      document.removeEventListener("focusin", closeWhenFocusLeaves);
    };
  }, []);

  function selectExisting(company: Company) {
    setSelected({ type: "existing", id: company.id, name: company.name });
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function selectNew(name: string) {
    setSelected({ type: "new", name });
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setError(null);
    setOpen(true);
    setActiveIndex(choices.length > 0 ? 0 : -1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function removeChoice(company: Company) {
    setError(null);
    setDeletingId(company.id);
    try {
      await deleteCompany(company.id);
      setRemovedIds((current) => [...current, company.id]);
      setConfirmingId(null);
      if (selected?.type === "existing" && selected.id === company.id) {
        setSelected(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("409") || message.includes("23503")
          ? "This company is used elsewhere and cannot be removed."
          : "Could not remove company.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function moveActive(direction: 1 | -1) {
    if (optionCount === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : optionCount - 1;
      return (current + direction + optionCount) % optionCount;
    });
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        selectExisting(filtered[activeIndex]);
      } else if (showCreate && (activeIndex === filtered.length || activeIndex < 0)) {
        selectNew(trimmedQuery);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {selected?.type === "existing" && <input type="hidden" name="company_id" value={selected.id} />}
      {selected?.type === "new" && <input type="hidden" name="new_company_name" value={selected.name} />}

      {selected ? (
        <div className="group flex w-full items-stretch rounded-md border border-neutral-900 bg-white transition-colors hover:bg-neutral-900">
          <button
            ref={triggerRef}
            id={controlId}
            type="button"
            role="combobox"
            aria-controls={listboxId}
            aria-describedby={ariaDescribedBy}
            aria-expanded="false"
            aria-haspopup="listbox"
            aria-invalid={ariaInvalid}
            onClick={clear}
            className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1"
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />
            <span className="flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-white">
              {selected.name}
            </span>
            {selected.type === "new" && (
              <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-300">new</span>
            )}
          </button>
          <button
            type="button"
            onClick={clear}
            aria-label={`Clear ${selected.name}`}
            className="m-1.5 ml-0 shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:text-neutral-300 group-hover:hover:bg-neutral-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            ref={inputRef}
            id={controlId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-describedby={ariaDescribedBy}
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-invalid={ariaInvalid}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            placeholder="Search companies..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => {
              setOpen(true);
              setActiveIndex(filtered.length > 0 ? 0 : -1);
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-9 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveIndex(choices.length > 0 ? 0 : -1);
                inputRef.current?.focus();
              }}
              aria-label="Clear company search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <ul id={listboxId} role="listbox" className="max-h-48 overflow-y-auto py-1">
            {filtered.map((company, index) => {
              const active = activeIndex === index;
              return (
                <li key={company.id} role="none">
                  <button
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectExisting(company)}
                      className={`group flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900 hover:text-white"}`}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
                      <span className="truncate">{company.name}</span>
                  </button>
                </li>
              );
            })}
            {showCreate && (
              <li role="none" className={filtered.length > 0 ? "border-t border-neutral-100" : ""}>
                <button
                  id={`${listboxId}-option-${filtered.length}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(filtered.length)}
                  onClick={() => selectNew(trimmedQuery)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 ${activeIndex === filtered.length ? "bg-blue-100" : ""}`}
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                    <Plus className="h-2.5 w-2.5" />
                  </span>
                  <span>Create <span className="font-medium">&quot;{trimmedQuery}&quot;</span></span>
                </button>
              </li>
            )}
          </ul>
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-3 text-sm text-neutral-400">No companies found</p>
          )}
          <details className="border-t border-neutral-100">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800">
              Manage companies
            </summary>
            <div className="max-h-40 space-y-1 overflow-y-auto border-t border-neutral-100 p-2">
              {error && (
                <p role="alert" className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-600">
                  {error}
                </p>
              )}
              {choices.map((company) => (
                <div key={company.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-neutral-50">
                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">
                    {company.name}
                  </span>
                  {confirmingId === company.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={deletingId === company.id}
                        className="rounded px-1.5 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeChoice(company)}
                        disabled={deletingId === company.id}
                        className="rounded bg-red-600 px-1.5 py-1 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === company.id ? "Deleting…" : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(company.id)}
                      aria-label={`Delete ${company.name}`}
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
