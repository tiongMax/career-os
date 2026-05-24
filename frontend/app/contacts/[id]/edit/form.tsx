"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Company, Contact } from "@/lib/api";
import { updateContact } from "@/lib/api";
import { CompanyCombobox } from "@/components/company-combobox";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { RelationshipSelect } from "@/components/relationship-select";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export function EditContactForm({ contact, companies }: { contact: Contact; companies: Company[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultCompanyName = companies.find((company) => company.id === contact.company_id)?.name ?? "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    try {
      const existingCompanyId = fd.get("company_id") as string;
      const newCompanyName = (fd.get("new_company_name") as string)?.trim();

      let companyId = existingCompanyId;
      if (newCompanyName) {
        const res = await fetch(`${BASE}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCompanyName }),
        });
        if (!res.ok) throw new Error(`Failed to create company: ${await res.text().catch(() => res.statusText)}`);
        companyId = (await res.json()).id;
      }

      const payload: Parameters<typeof updateContact>[1] = {};
      if (companyId) payload.company_id = companyId;

      const name = (fd.get("name") as string).trim();
      if (name) payload.name = name;

      const role = (fd.get("role") as string).trim();
      const email = (fd.get("email") as string).trim();
      const linkedin = (fd.get("linkedin_url") as string).trim();
      const relationship = fd.get("relationship") as string;
      const notes = (fd.get("notes") as string).trim();

      payload.role = role || undefined;
      payload.email = email || undefined;
      payload.linkedin_url = linkedin || undefined;
      payload.relationship = relationship || undefined;
      payload.notes = notes || undefined;

      await updateContact(contact.id, payload);
      router.push(`/contacts/${contact.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <FormSection title="Contact">
        <Field label="Company">
          <CompanyCombobox
            companies={companies}
            defaultId={contact.company_id}
            defaultName={defaultCompanyName}
          />
        </Field>
        <Field label="Name">
          <input
            name="name"
            defaultValue={contact.name}
            required
            placeholder="e.g. Jane Smith"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <input
              name="role"
              defaultValue={contact.role ?? ""}
              placeholder="e.g. Senior Recruiter"
              className={inputClass}
            />
          </Field>
          <Field label="Relationship">
            <RelationshipSelect defaultValue={contact.relationship ?? ""} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Details">
        <Field label="Email">
          <input
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
            placeholder="jane@company.com"
            className={inputClass}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            name="linkedin_url"
            type="url"
            defaultValue={contact.linkedin_url ?? ""}
            placeholder="https://linkedin.com/in/..."
            className={inputClass}
          />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={contact.notes ?? ""}
            placeholder="Any notes..."
            className={`${inputClass} resize-none`}
          />
        </Field>
      </FormSection>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <Link
          href={`/contacts/${contact.id}`}
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
