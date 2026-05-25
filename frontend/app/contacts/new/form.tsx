"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Company } from "@/lib/api";
import { createCompany, createContact } from "@/lib/api";
import { CompanyCombobox } from "@/components/company-combobox";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { RelationshipSelect } from "@/components/relationship-select";

export function NewContactForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [relationship, setRelationship] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    try {
      const existingCompanyId = fd.get("company_id") as string;
      const newCompanyName = (fd.get("new_company_name") as string)?.trim();

      if (!existingCompanyId && !newCompanyName) {
        throw new Error("Please select or create a company");
      }

      let companyId: string;
      if (newCompanyName) {
        const company = await createCompany({ name: newCompanyName }).catch((err) => {
          throw new Error(`Failed to create company: ${err instanceof Error ? err.message : String(err)}`);
        });
        companyId = company.id;
      } else {
        companyId = existingCompanyId;
      }

      const name = (fd.get("name") as string).trim();
      if (!name) throw new Error("Name is required");

      const payload: Parameters<typeof createContact>[0] = { company_id: companyId, name };
      const role = (fd.get("role") as string).trim();
      const email = (fd.get("email") as string).trim();
      const linkedin = (fd.get("linkedin_url") as string).trim();
      const notes = (fd.get("notes") as string).trim();

      if (role) payload.role = role;
      if (email) payload.email = email;
      if (linkedin) payload.linkedin_url = linkedin;
      if (relationship) payload.relationship = relationship;
      if (notes) payload.notes = notes;

      await createContact(payload);
      router.push("/contacts");
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
        <Field label="Company" required>
          <CompanyCombobox companies={companies} />
        </Field>
        <Field label="Name" required>
          <input
            name="name"
            required
            placeholder="e.g. Jane Smith"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <input
              name="role"
              placeholder="e.g. Senior Recruiter"
              className={inputClass}
            />
          </Field>
          <Field label="Relationship">
            <RelationshipSelect value={relationship} onChange={setRelationship} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Details">
        <Field label="Email">
          <input
            name="email"
            type="email"
            placeholder="jane@company.com"
            className={inputClass}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            name="linkedin_url"
            type="url"
            placeholder="https://linkedin.com/in/..."
            className={inputClass}
          />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
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
          {loading ? "Saving..." : "Create Contact"}
        </button>
        <Link
          href="/contacts"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
