"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, FileText, Globe, MapPin, Trash2 } from "lucide-react";
import type { Application, AuditLog, Company, ResumeVersion, RoleTrack, UpdateApplicationPayload } from "@/lib/api";
import { createCompany, createRoleTrack, deleteApplication, updateApplication, updateApplicationStatus } from "@/lib/api";
import { CompanyCombobox } from "@/components/company-combobox";
import { Field, FormSection, inputClass } from "@/components/forms/form-section";
import { PasswordInput } from "@/components/password-input";
import { OptionCombobox, type Option } from "@/components/ui/option-combobox";
import { MultiOptionCombobox } from "@/components/ui/multi-option-combobox";
import { DeleteApplicationDialog, DeleteApplicationToast } from "./delete-application-dialog";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_OPTIONS,
  formatTrackLabel,
  isVisibleTrack,
  statusHasCompletionDate,
  statusHasReceivedDate,
} from "@/lib/domain/applications";

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

function dateInputValue(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function optionForValue(options: Option[], value?: string): Option | undefined {
  if (!value) return undefined;
  return options.find((option) => option.value === value) ?? { value, label: value };
}

function statusDateDefaults(application: Application, auditLogs: AuditLog[], selectedStatus: string) {
  for (const log of auditLogs) {
    const value = log.new_value;
    if (!value || typeof value !== "object") continue;
    const status = (value as { status?: unknown }).status;
    if (status !== selectedStatus) continue;

    const receivedAt = (value as { received_at?: unknown }).received_at;
    const completedAt = (value as { completed_at?: unknown }).completed_at;
    return {
      receivedAt: typeof receivedAt === "string" ? dateInputValue(receivedAt) : "",
      completedAt: typeof completedAt === "string" ? dateInputValue(completedAt) : "",
    };
  }

  return {
    receivedAt: selectedStatus === "applied" ? dateInputValue(application.applied_at) : "",
    completedAt: "",
  };
}

function dateInputToISO(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

export function EditApplicationForm({
  application,
  companies,
  resumes,
  tracks,
  auditLogs,
}: {
  application: Application;
  companies: Company[];
  resumes: ResumeVersion[];
  tracks: RoleTrack[];
  auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState(application.status);
  const defaultStatusDates = statusDateDefaults(application, auditLogs, status);
  const showReceivedDate = statusHasReceivedDate(status);
  const showCompletionDate = statusHasCompletionDate(status);

  const defaultCompanyName = companies.find((company) => company.id === application.company_id)?.name ?? "";

  const trackOptions: Option[] = tracks
    .filter((track) => isVisibleTrack(track.name))
    .map((track) => ({
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

      let companyId = existingCompanyId;
      if (newCompanyName) {
        const company = await createCompany({ name: newCompanyName }).catch((err) => {
          throw new Error(`Failed to create company: ${err instanceof Error ? err.message : String(err)}`);
        });
        companyId = company.id;
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

      const payload: UpdateApplicationPayload = {
        company_id: companyId,
        title: (fd.get("title") as string).trim(),
        role_track: selectedTracks[0],
        role_tracks: selectedTracks,
        source: ((fd.get("source") as string) || "").trim(),
        location: ((fd.get("location") as string) || "").trim(),
        job_url: ((fd.get("job_url") as string) || "").trim(),
        portal_account: ((fd.get("portal_account") as string) || "").trim(),
        portal_password: ((fd.get("portal_password") as string) || "").trim(),
        notes: ((fd.get("notes") as string) || "").trim(),
        employment_type: (fd.get("employment_type") as string) || "",
      };

      const resumeVersionId = fd.get("resume_version_id") as string;
      if (resumeVersionId) payload.resume_version_id = resumeVersionId;

      const appliedAt = fd.get("applied_at") as string;
      if (appliedAt) payload.applied_at = new Date(appliedAt).toISOString();

      await updateApplication(application.id, payload);
      const nextStatus = (fd.get("status") as string) || "saved";
      const shouldSaveReceivedAt = statusHasReceivedDate(nextStatus);
      const shouldSaveCompletedAt = statusHasCompletionDate(nextStatus);
      const receivedAt = shouldSaveReceivedAt ? ((fd.get("status_received_at") as string) || "") : "";
      const completedAt = shouldSaveCompletedAt ? ((fd.get("status_completed_at") as string) || "") : "";
      const statusDatesChanged =
        receivedAt !== (shouldSaveReceivedAt ? defaultStatusDates.receivedAt : "") ||
        completedAt !== (shouldSaveCompletedAt ? defaultStatusDates.completedAt : "");
      if (nextStatus !== application.status || statusDatesChanged) {
        await updateApplicationStatus(application.id, nextStatus, {
          received_at: dateInputToISO(receivedAt),
          completed_at: dateInputToISO(completedAt),
        });
      }
      router.push(`/applications/${application.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setToast(null);
    setDeleting(true);

    try {
      await deleteApplication(application.id);
      router.push("/applications");
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to delete application");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {toast && <DeleteApplicationToast message={toast} onClose={() => setToast(null)} />}

      <FormSection title="Position">
        <Field label="Company" required>
          <CompanyCombobox
            companies={companies}
            defaultId={application.company_id}
            defaultName={defaultCompanyName}
          />
        </Field>
        <Field label="Role Title" required>
          <input
            name="title"
            required
            defaultValue={application.title}
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
              defaultValues={application.role_tracks?.length ? application.role_tracks : [application.role_track]}
              allowCustom
              required
            />
          </Field>
          <Field label="Status">
            <OptionCombobox
              name="status"
              options={APPLICATION_STATUS_OPTIONS}
              placeholder="Select status..."
              defaultOption={{
                value: application.status,
                label: APPLICATION_STATUS_LABELS[application.status] ?? application.status,
                dot: APPLICATION_STATUS_OPTIONS.find((option) => option.value === application.status)?.dot,
              }}
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
              defaultOption={optionForValue(EMPLOYMENT_OPTIONS, application.employment_type)}
              icon={Briefcase}
            />
          </Field>
          {status && status !== "saved" && (
            <Field label="Applied Date">
              <input
                name="applied_at"
                type="date"
                defaultValue={dateInputValue(application.applied_at)}
                className={inputClass}
              />
            </Field>
          )}
        </div>

        {(showReceivedDate || showCompletionDate) && (
          <div key={status} className="grid grid-cols-2 gap-4">
            {showReceivedDate && (
              <Field label="Received Date">
                <input
                  name="status_received_at"
                  type="date"
                  defaultValue={defaultStatusDates.receivedAt}
                  className={inputClass}
                />
              </Field>
            )}
            {showCompletionDate && (
              <Field label="Completion Date">
                <input
                  name="status_completed_at"
                  type="date"
                  defaultValue={defaultStatusDates.completedAt}
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Resume">
        <Field label="Resume Version">
          <OptionCombobox
            name="resume_version_id"
            options={resumeOptions}
            placeholder="Search resumes..."
            defaultOption={optionForValue(resumeOptions, application.resume_version_id)}
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
              defaultOption={optionForValue(SOURCE_OPTIONS, application.source)}
              allowCustom
              icon={Globe}
            />
          </Field>
          <Field label="Location">
            <OptionCombobox
              name="location"
              options={LOCATION_OPTIONS}
              placeholder="San Francisco, Remote..."
              defaultOption={optionForValue(LOCATION_OPTIONS, application.location)}
              allowCustom
              icon={MapPin}
            />
          </Field>
        </div>
        <Field label="Job URL">
          <input name="job_url" type="url" defaultValue={application.job_url ?? ""} placeholder="https://..." className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Portal Account">
            <input
              name="portal_account"
              defaultValue={application.portal_account ?? ""}
              placeholder="email or username used"
              autoComplete="username"
              className={inputClass}
            />
          </Field>
          <Field label="Portal Password">
            <PasswordInput
              name="portal_password"
              defaultValue={application.portal_password ?? ""}
              placeholder="password used"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={application.notes ?? ""}
            placeholder="Any notes..."
            className={`${inputClass} resize-none`}
          />
        </Field>
      </FormSection>

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || deleting}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/applications/${application.id}`}
            className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Cancel
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={loading || deleting}
          className="flex items-center gap-1.5 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-400 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
      {deleteOpen && (
        <DeleteApplicationDialog
          title={application.title}
          deleting={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </form>
  );
}
