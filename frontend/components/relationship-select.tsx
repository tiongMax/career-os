"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type AriaAttributes,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { RELATIONSHIP_OPTIONS } from "@/lib/domain/contacts";

type RelationshipSelectProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
};

export function RelationshipSelect({
  name = "relationship",
  value,
  defaultValue = "",
  onChange,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: RelationshipSelectProps) {
  const reactId = useId().replace(/:/g, "");
  const controlId = id ?? `${name}-${reactId}`;
  const listboxId = `${controlId}-listbox`;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentValue = value ?? internalValue;
  const selected = RELATIONSHIP_OPTIONS.find((option) => option.value === currentValue);
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    function closeWhenFocusLeaves(e: MouseEvent | FocusEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  function setValue(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  function choose(index: number) {
    const option = RELATIONSHIP_OPTIONS[index];
    if (!option) return;
    setValue(option.value);
    setOpen(false);
    setActiveIndex(-1);
    setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function moveActive(direction: 1 | -1) {
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : RELATIONSHIP_OPTIONS.length - 1;
      return (current + direction + RELATIONSHIP_OPTIONS.length) % RELATIONSHIP_OPTIONS.length;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      moveActive(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      choose(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActiveIndex(RELATIONSHIP_OPTIONS.length - 1);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={currentValue} />
      <div className={`flex w-full items-stretch rounded-md border transition-colors ${
        selected
          ? "group border-neutral-900 bg-white hover:bg-neutral-900"
          : "border-neutral-300 text-neutral-400 hover:border-neutral-400"
      }`}>
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
          aria-activedescendant={open ? activeOptionId : undefined}
          onClick={() => {
            setOpen((wasOpen) => !wasOpen);
            setActiveIndex(selected ? RELATIONSHIP_OPTIONS.findIndex((option) => option.value === selected.value) : 0);
          }}
          onKeyDown={handleKeyDown}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1"
        >
          <span className={`flex-1 ${selected ? "text-neutral-800 group-hover:text-white" : "text-neutral-400"}`}>
            {selected?.label ?? "Select relationship..."}
          </span>
          {!selected && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-300" />}
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label={`Clear ${selected.label}`}
            className="m-1.5 ml-0 shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:text-neutral-300 group-hover:hover:bg-neutral-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {RELATIONSHIP_OPTIONS.map((option, index) => {
            const isSelected = currentValue === option.value;
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
                  onClick={() => choose(index)}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive || isSelected
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
