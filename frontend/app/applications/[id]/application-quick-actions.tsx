"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, Check, FilePlus2, Loader2 } from "lucide-react";

import {
  createApplicationJobDescription,
  createInterview,
  type JobDescription,
  updateApplicationStatus,
  updateJobDescription,
} from "@/lib/api";
import { APPLICATION_STATUS_OPTIONS } from "@/lib/domain/applications";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { FollowUpDialog } from "../../reminders/follow-up-dialog";

type ActionKind = "status" | "job-description" | "interview";

const interviewTypes = [
  ["recruiter", "Recruiter screen"],
  ["online_assessment", "Online assessment"],
  ["technical", "Technical interview"],
  ["system_design", "System design"],
  ["behavioral", "Behavioral interview"],
  ["final", "Final interview"],
] as const;

export function ApplicationQuickActions({
  applicationId,
  currentStatus,
  jobDescription,
}: {
  applicationId: string;
  currentStatus: string;
  jobDescription: JobDescription | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<ActionKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function begin(kind: ActionKind) {
    setError(null);
    setOpen(kind);
  }

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setSaving(true);
    setError(null);
    try {
      await action();
      setOpen(null);
      setSuccess(successMessage);
      router.refresh();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => begin("status")}>
          <Check aria-hidden="true" />
          Change status
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => begin("job-description")}
        >
          <FilePlus2 aria-hidden="true" />
          {jobDescription ? "Edit job description" : "Add job description"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => begin("interview")}>
          <CalendarPlus aria-hidden="true" />
          Schedule interview
        </Button>
        <FollowUpDialog
          applicationId={applicationId}
          triggerLabel="Add follow-up"
          triggerVariant="outline"
        />
      </div>

      <Dialog
        open={open === "status"}
        onClose={() => !saving && setOpen(null)}
        title="Update application status"
        description="Keep the pipeline current so your dashboard can surface the right next step."
      >
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const status = new FormData(event.currentTarget).get("status") as string;
            void run(
              () => updateApplicationStatus(applicationId, status),
              "Application status updated",
            );
          }}
        >
          <label className="block text-sm font-medium text-foreground">
            Status
            <select
              name="status"
              defaultValue={currentStatus}
              className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              {APPLICATION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <DialogError message={error} />
          <DialogActions saving={saving} onCancel={() => setOpen(null)} />
        </form>
      </Dialog>

      <Dialog
        open={open === "job-description"}
        onClose={() => !saving && setOpen(null)}
        title={jobDescription ? "Edit job description" : "Add job description"}
        description="Paste the role details once, then use them for resume matching and interview preparation."
        className="max-w-2xl"
      >
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const rawText = String(
              new FormData(event.currentTarget).get("raw_text") ?? "",
            ).trim();
            if (!rawText) {
              setError("Paste the job description before saving.");
              return;
            }
            void run(
              () =>
                jobDescription
                  ? updateJobDescription(jobDescription.id, { raw_text: rawText })
                  : createApplicationJobDescription(applicationId, {
                      raw_text: rawText,
                    }),
              jobDescription ? "Job description updated" : "Job description added",
            );
          }}
        >
          <label className="block text-sm font-medium text-foreground">
            Job description
            <textarea
              name="raw_text"
              rows={12}
              required
              defaultValue={jobDescription?.raw_text ?? ""}
              placeholder="Paste the responsibilities, requirements, and role details…"
              className="mt-1.5 w-full resize-y rounded-control border border-border-strong bg-surface px-3 py-2 text-sm leading-6"
            />
          </label>
          <DialogError message={error} />
          <DialogActions saving={saving} onCancel={() => setOpen(null)} />
        </form>
      </Dialog>

      <Dialog
        open={open === "interview"}
        onClose={() => !saving && setOpen(null)}
        title="Schedule an interview"
        description="Add the next round so it stays visible alongside your preparation work."
      >
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const localDate = String(data.get("scheduled_at") ?? "");
            void run(
              () =>
                createInterview(applicationId, {
                  round_type: String(data.get("round_type") ?? "technical"),
                  ...(localDate
                    ? { scheduled_at: new Date(localDate).toISOString() }
                    : {}),
                  ...(String(data.get("interviewer") ?? "").trim()
                    ? { interviewer: String(data.get("interviewer")).trim() }
                    : {}),
                  ...(String(data.get("notes") ?? "").trim()
                    ? { notes: String(data.get("notes")).trim() }
                    : {}),
                }),
              "Interview added",
            );
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Round
              <select
                name="round_type"
                className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                {interviewTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Date and time
              <input
                type="datetime-local"
                name="scheduled_at"
                className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-foreground">
            Interviewer
            <input
              name="interviewer"
              placeholder="Name or panel"
              className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Topics, format, meeting link, or anything to prepare…"
              className="mt-1.5 w-full resize-y rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
          <DialogError message={error} />
          <DialogActions saving={saving} onCancel={() => setOpen(null)} />
        </form>
      </Dialog>

      {success && (
        <Toast
          title={success}
          variant="success"
          onClose={() => setSuccess(null)}
        />
      )}
    </>
  );
}

function DialogActions({
  saving,
  onCancel,
}: {
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function DialogError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  ) : null;
}

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/^API \d+:\s*/, "") || "Could not save this change.";
}
