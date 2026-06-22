"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, FileText, Globe, MapPin } from "lucide-react";
import type { Company, ResumeVersion, RoleTrack } from "@/lib/api";
import { createApplication, createCompany, createRoleTrack, type CreateApplicationPayload } from "@/lib/api";
import { CompanyCombobox } from "@/components/company-combobox";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { PasswordInput } from "@/components/password-input";
import { OptionCombobox, type Option } from "@/components/ui/option-combobox";
import { MultiOptionCombobox } from "@/components/ui/multi-option-combobox";
import { APPLICATION_STATUS_OPTIONS, formatTrackLabel } from "@/lib/domain/applications";

const EMPLOYMENT_OPTIONS: Option[] = [
  { value: "full_time", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "apprentice", label: "Apprentice" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const SOURCE_OPTIONS: Option[] = [
  "LinkedIn", "Referral", "Company Website", "Indeed",
  "Glassdoor", "Wellfound", "Handshake", "Recruiter",
  "Job Fair", "Cold Outreach",
].map((source) => ({ value: source, label: source }));

const LOCATION_OPTIONS: Option[] = [
  "Singapore",
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
    label: formatTrackLabel(track.name),
  }));

  const resumeOptions: Option[] = resumes.map((resume) => ({
    value: resume.id,
    label: resume.name,
    meta: formatTrackLabel(resume.track),
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
        const company = await createCompany({ name: newCompanyName }).catch((err) => {
          throw new Error(`Failed to create company: ${err instanceof Error ? err.message : String(err)}`);
        });
        companyId = company.id;
      } else {
        companyId = existingCompanyId;
      }

      const selectedTracks = fd.getAll("role_tracks").map((value) => String(value).trim().toLowerCase()).filter(Boolean);
      if (selectedTracks.length === 0) throw new Error("Track is required");

      for (const track of selectedTracks) {
        const isKnownTrack = tracks.some((existingTrack) => existingTrack.name === track);
        if (!isKnownTrack) {
          await createRoleTrack(track).catch((err) => {
            if (!String(err).includes("409")) throw err;
          });
        }
      }

      const body: CreateApplicationPayload = {
        company_id: companyId,
        title: (fd.get("title") as string).trim(),
        role_track: selectedTracks[0],
        role_tracks: selectedTracks,
        status: (fd.get("status") as string) || "saved",
      };
      if (fd.get("resume_version_id")) body.resume_version_id = fd.get("resume_version_id") as string;
      if (fd.get("source")) body.source = fd.get("source") as string;
      if (fd.get("location")) body.location = fd.get("location") as string;
      if (fd.get("job_url")) body.job_url = fd.get("job_url") as string;
      if (fd.get("portal_account")) body.portal_account = fd.get("portal_account") as string;
      if (fd.get("portal_password")) body.portal_password = fd.get("portal_password") as string;
      if (fd.get("notes")) body.notes = fd.get("notes") as string;
      if (fd.get("employment_type")) body.employment_type = fd.get("employment_type") as string;
      if (fd.get("applied_at")) {
        body.applied_at = new Date(fd.get("applied_at") as string).toISOString();
      }

      const app = await createApplication(body);
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
            <MultiOptionCombobox
              name="role_tracks"
              options={trackOptions}
              placeholder="Select tracks..."
              allowCustom
              required
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Portal Account">
            <input
              name="portal_account"
              placeholder="email or username used"
              autoComplete="username"
              className={inputClass}
            />
          </Field>
          <Field label="Portal Password">
            <PasswordInput
              name="portal_password"
              placeholder="password used"
            />
          </Field>
        </div>
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
