"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import type { Option } from "./option-combobox";

type MultiOptionComboboxProps = {
  name: string;
  options: Option[];
  placeholder?: string;
  defaultValues?: string[];
  required?: boolean;
  allowCustom?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

export function MultiOptionCombobox({
  name,
  options,
  placeholder = "Search...",
  defaultValues = [],
  required = false,
  allowCustom = false,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: MultiOptionComboboxProps) {
  const reactId = useId().replace(/:/g, "");
  const controlId = id ?? `${name}-${reactId}`;
  const listboxId = `${controlId}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => unique(defaultValues));
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const optionMap = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const filtered = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );
  const customValue = query.trim().toLowerCase();
  const showCreate = allowCustom && customValue.length > 0 && !hasExactMatch && !selected.includes(customValue);
  const optionCount = filtered.length + (showCreate ? 1 : 0);
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const toggle = useCallback((value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    setSelected((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized],
    );
    setQuery("");
    setOpen(true);
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

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

  const selectedOptions = selected.map((value) => optionMap.get(value) ?? { value, label: value });

  function openMenu() {
    setOpen(true);
    setActiveIndex(filtered.length > 0 ? 0 : -1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function moveActive(direction: 1 | -1) {
    if (optionCount === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : optionCount - 1;
      return (current + direction + optionCount) % optionCount;
    });
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu();
      if (e.key === "ArrowUp") setActiveIndex(optionCount > 0 ? optionCount - 1 : -1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
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
        toggle(filtered[activeIndex].value);
      } else if (showCreate && (activeIndex === filtered.length || activeIndex < 0)) {
        toggle(customValue);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="role_track" value={selected[0] ?? ""} />
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {required && (
        <input
          className="sr-only"
          tabIndex={-1}
          required
          value={selected.length > 0 ? "selected" : ""}
          readOnly
          aria-label={`${name.replace(/_/g, " ")} selection`}
        />
      )}

      <div className={`flex min-h-10 w-full items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 transition-colors ${
        selected.length > 0 ? "border-neutral-900" : "border-neutral-300 hover:border-neutral-400"
      }`}>
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
          >
            {option.label}
            <button
              type="button"
              onClick={() => toggle(option.value)}
              aria-label={`Remove ${option.label}`}
              className="rounded text-neutral-400 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          aria-required={required || undefined}
          aria-activedescendant={open ? activeOptionId : undefined}
          onClick={() => open ? setOpen(false) : openMenu()}
          onKeyDown={handleTriggerKeyDown}
          className="flex min-w-24 flex-1 items-center justify-between gap-2 rounded px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          {selectedOptions.length === 0 ? (
            <span className="text-sm font-medium text-neutral-400">{placeholder}</span>
          ) : (
            <span className="sr-only">Edit selected options</span>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="relative border-b border-neutral-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label={`Search ${name.replace(/_/g, " ")}`}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded="true"
              aria-activedescendant={activeOptionId}
              autoComplete="off"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-md border border-neutral-200 py-1.5 pl-8 pr-3 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <ul id={listboxId} role="listbox" aria-multiselectable="true" className="max-h-56 overflow-y-auto py-1">
            {filtered.map((option, index) => {
              const checked = selected.includes(option.value);
              const active = activeIndex === index;
              return (
                <li key={option.value} role="none">
                  <button
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => toggle(option.value)}
                    className={`group flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                      active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
                    }`}
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
            {showCreate && (
              <li role="none" className="border-t border-neutral-100">
                <button
                  id={`${listboxId}-option-${filtered.length}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(filtered.length)}
                  onClick={() => toggle(customValue)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 ${activeIndex === filtered.length ? "bg-blue-100" : ""}`}
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-blue-400">
                    <Plus className="h-2.5 w-2.5" />
                  </span>
                  <span>Use <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span></span>
                </button>
              </li>
            )}
          </ul>
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-3 text-sm text-neutral-400">No results</p>
          )}
        </div>
      )}
    </div>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}
