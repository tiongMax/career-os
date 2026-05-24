"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, FileText, Globe, Layers, MapPin } from "lucide-react";
import type { Company, ResumeVersion, RoleTrack } from "@/lib/api";
import { createRoleTrack } from "@/lib/api";
import { CompanyCombobox } from "@/components/company-combobox";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { OptionCombobox, type Option } from "@/components/ui/option-combobox";
import { APPLICATION_STATUS_OPTIONS } from "@/lib/domain/applications";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const EMPLOYMENT_OPTIONS: Option[] = [
  { value: "full_time", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const SOURCE_OPTIONS: Option[] = [
  "LinkedIn", "Referral", "Company Website", "Indeed",
  "Glassdoor", "Wellfound", "Handshake", "Recruiter",
  "Job Fair", "Cold Outreach",
].map((source) => ({ value: source, label: source }));

const LOCATION_OPTIONS: Option[] = [
  "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA",
  "Austin, TX", "Boston, MA", "Chicago, IL", "Los Angeles, CA",
  "Denver, CO", "Miami, FL", "Washington, DC", "Pittsburgh, PA",
  "Portland, OR", "Atlanta, GA",
].map((location) => ({ value: location, label: location }));

export function NewApplicationForm({
  companies,
  resumes,
  tracks,
}: {
  companies: Company[];
  resumes: ResumeVersion[];
  tracks: RoleTrack[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const trackOptions: Option[] = tracks.map((track) => ({
    value: track.name,
    label: track.name.charAt(0).toUpperCase() + track.name.slice(1),
  }));

  const resumeOptions: Option[] = resumes.map((resume) => ({
    value: resume.id,
    label: resume.name,
    meta: resume.track,
  }));

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
        const res = await fetch(`${BASE}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCompanyName }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Failed to create company: ${text}`);
        }
        const company = await res.json();
        companyId = company.id;
      } else {
        companyId = existingCompanyId;
      }

      const track = (fd.get("role_track") as string).trim().toLowerCase();
      if (!track) throw new Error("Track is required");

      const isKnownTrack = tracks.some((existingTrack) => existingTrack.name === track);
      if (!isKnownTrack) {
        await createRoleTrack(track).catch((err) => {
          if (!String(err).includes("409")) throw err;
        });
      }

      const body: Record<string, unknown> = {
        company_id: companyId,
        title: fd.get("title"),
        role_track: track,
        status: fd.get("status") || "saved",
      };
      if (fd.get("resume_version_id")) body.resume_version_id = fd.get("resume_version_id");
      if (fd.get("source")) body.source = fd.get("source");
      if (fd.get("location")) body.location = fd.get("location");
      if (fd.get("job_url")) body.job_url = fd.get("job_url");
      if (fd.get("notes")) body.notes = fd.get("notes");
      if (fd.get("employment_type")) body.employment_type = fd.get("employment_type");
      if (fd.get("applied_at")) {
        body.applied_at = new Date(fd.get("applied_at") as string).toISOString();
      }

      const res = await fetch(`${BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text);
      }
      const app = await res.json();
      router.push(`/applications/${app.id}`);
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

      <FormSection title="Position">
        <Field label="Company" required>
          <CompanyCombobox companies={companies} />
        </Field>
        <Field label="Role Title" required>
          <input
            name="title"
            required
            placeholder="e.g. Backend Engineer Intern"
            className={inputClass}
          />
        </Field>
      </FormSection>

      <FormSection title="Classification">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Track" required>
            <OptionCombobox
              name="role_track"
              options={trackOptions}
              placeholder="Select track..."
              allowCustom
              required
              icon={Layers}
            />
          </Field>
          <Field label="Status">
            <OptionCombobox
              name="status"
              options={APPLICATION_STATUS_OPTIONS}
              placeholder="Select status..."
              required
              onSelect={setStatus}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment Type">
            <OptionCombobox
              name="employment_type"
              options={EMPLOYMENT_OPTIONS}
              placeholder="Select type..."
              icon={Briefcase}
            />
          </Field>
          {status && status !== "saved" && (
            <Field label="Applied Date">
              <input
                name="applied_at"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </FormSection>

      <FormSection title="Resume">
        <Field label="Resume Version">
          <OptionCombobox
            name="resume_version_id"
            options={resumeOptions}
            placeholder="Search resumes..."
            icon={FileText}
          />
        </Field>
      </FormSection>

      <FormSection title="Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <OptionCombobox
              name="source"
              options={SOURCE_OPTIONS}
              placeholder="LinkedIn, referral..."
              allowCustom
              icon={Globe}
            />
          </Field>
          <Field label="Location">
            <OptionCombobox
              name="location"
              options={LOCATION_OPTIONS}
              placeholder="San Francisco, Remote..."
              allowCustom
              icon={MapPin}
            />
          </Field>
        </div>
        <Field label="Job URL">
          <input name="job_url" type="url" placeholder="https://..." className={inputClass} />
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
          {loading ? "Saving..." : "Create Application"}
        </button>
        <Link
          href="/applications"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
