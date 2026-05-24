"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Paperclip, FileText } from "lucide-react";
import { createResumeVersion, uploadResumePDF } from "@/lib/api";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { OptionCombobox, type Option } from "@/components/ui/option-combobox";

const TRACK_OPTIONS: Option[] = ["backend", "ai", "quant", "general"].map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export function NewResumeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) setTags((prev) => prev.slice(0, -1));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (tagInput.trim()) addTag(tagInput);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const track = fd.get("track") as string;

    try {
      const resume = await createResumeVersion({ name, track, tags });
      if (pdfFile) await uploadResumePDF(resume.id, pdfFile);
      router.push("/resume-versions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <FormSection title="Details">
        <Field label="Name" required>
          <input name="name" required placeholder="e.g. Full Stack v2" className={inputClass} />
        </Field>
        <Field label="Track" required>
          <OptionCombobox name="track" options={TRACK_OPTIONS} placeholder="Select track…" required />
        </Field>
        <Field label="Tags">
          <div
            className="flex min-h-9.5 flex-wrap gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-neutral-900 focus-within:border-transparent"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span key={tag} className="group flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100 transition-colors">
                {tag}
                <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="cursor-pointer text-blue-400 hover:text-blue-700">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder={tags.length === 0 ? "typescript, react, go… (Enter or comma to add)" : ""}
              className="min-w-30 flex-1 bg-transparent text-sm text-neutral-800 placeholder-neutral-400 outline-none"
            />
          </div>
        </Field>
        <Field label="Resume PDF">
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          {pdfFile ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                <span className="truncate text-sm text-neutral-700">{pdfFile.name}</span>
              </div>
              <button type="button" onClick={() => setPdfFile(null)} className="ml-3 shrink-0 text-xs text-neutral-400 hover:text-red-500 transition-colors">
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-4 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <Paperclip className="h-4 w-4" />
              Click to attach a PDF
            </button>
          )}
        </Field>
      </FormSection>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors">
          {loading ? "Saving…" : "Create Resume"}
        </button>
        <Link href="/resume-versions" className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}
