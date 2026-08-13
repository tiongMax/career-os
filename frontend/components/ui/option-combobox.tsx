"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type AriaAttributes,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  meta?: string;
  dot?: string;
}

type OptionComboboxProps = {
  name: string;
  options: Option[];
  placeholder?: string;
  defaultOption?: Option;
  required?: boolean;
  allowCustom?: boolean;
  onSelect?: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

export function OptionCombobox({
  name,
  options,
  placeholder = "Search…",
  defaultOption,
  required = false,
  allowCustom = false,
  onSelect,
  icon: Icon,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: OptionComboboxProps) {
  const reactId = useId().replace(/:/g, "");
  const controlId = id ?? `${name}-${reactId}`;
  const listboxId = `${controlId}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(defaultOption ?? null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreate = allowCustom && query.trim().length > 0 && !hasExactMatch && !selected;
  const optionCount = filtered.length + (showCreate ? 1 : 0);
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  function pick(option: Option) {
    setSelected(option);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(option.value);
  }

  const pickCustom = useCallback((raw: string) => {
    const option: Option = { value: raw, label: raw };
    setSelected(option);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(option.value);
  }, [onSelect]);

  useEffect(() => {
    function closeWhenFocusLeaves(e: MouseEvent | FocusEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        if (!selected) {
          if (allowCustom && query.trim()) {
            pickCustom(query.trim());
          } else {
            setQuery("");
          }
        }
      }
    }
    document.addEventListener("mousedown", closeWhenFocusLeaves);
    document.addEventListener("focusin", closeWhenFocusLeaves);
    return () => {
      document.removeEventListener("mousedown", closeWhenFocusLeaves);
      document.removeEventListener("focusin", closeWhenFocusLeaves);
    };
  }, [selected, query, allowCustom, pickCustom]);

  function clear() {
    setSelected(null);
    setQuery("");
    setOpen(true);
    setActiveIndex(options.length > 0 ? 0 : -1);
    onSelect?.("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function moveActive(direction: 1 | -1) {
    if (optionCount === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : optionCount - 1;
      return (current + direction + optionCount) % optionCount;
    });
  }

  function chooseActive() {
    if (activeIndex >= 0 && activeIndex < filtered.length) {
      pick(filtered[activeIndex]);
      return;
    }
    if (showCreate && (activeIndex === filtered.length || activeIndex < 0)) {
      pickCustom(query.trim());
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
      chooseActive();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      moveActive(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      chooseActive();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.value ?? ""} />
      {required && (
        <input
          className="sr-only"
          tabIndex={-1}
          required
          value={selected ? "selected" : ""}
          onChange={() => undefined}
          aria-label={`${name.replace(/_/g, " ")} selection`}
        />
      )}

      {selected ? (
        <div className="group flex w-full items-stretch rounded-md border border-neutral-900 bg-white transition-colors hover:bg-neutral-900">
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
            onClick={() => {
              setOpen((current) => !current);
              setActiveIndex(options.findIndex((option) => option.value === selected.value));
            }}
            onKeyDown={handleTriggerKeyDown}
            className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
          >
            {selected.dot && (
              <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot} group-hover:opacity-70`} />
            )}
            <Check className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />
            <span className="flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-white">
              {selected.label}
            </span>
            {selected.meta && (
              <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-300">
                {selected.meta}
              </span>
            )}
            {required && (
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
            )}
          </button>
          {!required && (
            <button
              type="button"
              onClick={clear}
              aria-label={`Clear ${selected.label}`}
              className="m-1.5 ml-0 shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:text-neutral-300 group-hover:hover:bg-neutral-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : open ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            ref={inputRef}
            id={controlId}
            type="text"
            role="combobox"
            aria-controls={listboxId}
            aria-describedby={ariaDescribedBy}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={ariaInvalid}
            aria-required={required || undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-9 text-sm font-medium text-neutral-800 placeholder-neutral-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveIndex(options.length > 0 ? 0 : -1);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
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
          onClick={() => {
            setOpen(true);
            setActiveIndex(options.length > 0 ? 0 : -1);
          }}
          onKeyDown={handleTriggerKeyDown}
          className="flex w-full items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-left text-sm font-medium text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-500"
        >
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate">{placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <ul id={listboxId} role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.map((option, index) => {
              const isSelected = selected?.value === option.value;
              const isActive = activeIndex === index;
              return (
                <li key={option.value} role="none">
                  <button
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(option)}
                    className={`group flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive || isSelected
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    {option.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />}
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
                    ) : Icon ? (
                      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-300" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.meta && (
                      <span className={`shrink-0 text-xs ${isActive || isSelected ? "text-neutral-300" : "text-neutral-400 group-hover:text-neutral-300"}`}>
                        {option.meta}
                      </span>
                    )}
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
                  onClick={() => pickCustom(query.trim())}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 ${activeIndex === filtered.length ? "bg-blue-100" : ""}`}
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
