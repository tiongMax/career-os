"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import type { Option } from "./option-combobox";

export function MultiOptionCombobox({
  name,
  options,
  placeholder = "Search...",
  defaultValues = [],
  required = false,
  allowCustom = false,
}: {
  name: string;
  options: Option[];
  placeholder?: string;
  defaultValues?: string[];
  required?: boolean;
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => unique(defaultValues));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const optionMap = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const filtered = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase()
  );
  const customValue = query.trim().toLowerCase();
  const showCreate = allowCustom && customValue.length > 0 && !hasExactMatch && !selected.includes(customValue);

  const toggle = useCallback((value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    setSelected((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized]
    );
    setQuery("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedOptions = selected.map((value) => optionMap.get(value) ?? { value, label: value });

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="role_track" value={selected[0] ?? ""} />
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {required && <input className="sr-only" tabIndex={-1} required value={selected.length > 0 ? "selected" : ""} readOnly />}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`flex min-h-10 w-full items-center gap-2 rounded-md border bg-white px-3 py-2 text-left transition-colors ${
          selected.length > 0 ? "border-neutral-900" : "border-neutral-300 hover:border-neutral-400"
        }`}
      >
        <div className="flex flex-1 flex-wrap gap-1.5">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
              >
                {option.label}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option.value);
                  }}
                  className="rounded text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          ) : (
            <span className="text-sm font-medium text-neutral-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="relative border-b border-neutral-100 p-2">
            <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-neutral-200 py-1.5 pl-8 pr-3 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(option.value);
                    }}
                    className="group flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-900 hover:text-white"
                  >
                    <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? "border-neutral-900 bg-neutral-900 group-hover:border-white" : "border-neutral-300 group-hover:border-white"}`}>
                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.meta && <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-300">{option.meta}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {showCreate && (
            <div className="border-t border-neutral-100">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(customValue);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
              >
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                  <Plus className="h-2.5 w-2.5" />
                </div>
                <span>Use <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span></span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}
