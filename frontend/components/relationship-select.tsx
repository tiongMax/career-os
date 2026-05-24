"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { RELATIONSHIP_OPTIONS } from "@/lib/domain/contacts";

export function RelationshipSelect({
  name = "relationship",
  value,
  defaultValue = "",
  onChange,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentValue = value ?? internalValue;
  const selected = RELATIONSHIP_OPTIONS.find((option) => option.value === currentValue);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function setValue(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={currentValue} />
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
          selected
            ? "border-neutral-900 bg-white text-neutral-800 hover:bg-neutral-900 hover:text-white group"
            : "border-neutral-300 text-neutral-400 hover:border-neutral-400"
        }`}
      >
        <span className="flex-1">{selected?.label ?? "Select relationship..."}</span>
        {selected ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setValue("");
            }}
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
          {RELATIONSHIP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                currentValue === option.value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {currentValue === option.value ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
