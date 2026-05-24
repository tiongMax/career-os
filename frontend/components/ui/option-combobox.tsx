"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Check, ChevronDown, Plus } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  meta?: string;
  dot?: string;
}

export function OptionCombobox({
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
