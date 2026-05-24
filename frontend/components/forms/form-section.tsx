import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-neutral-900 bg-white px-3 py-2 text-sm font-medium text-neutral-800 placeholder-shown:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white">
      <h2 className="rounded-t-lg px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50">
        {title}
      </h2>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
