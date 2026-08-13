"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import {
  createReminder,
  type Application,
  type Reminder,
  updateReminder,
} from "@/lib/api";

export function FollowUpDialog({
  applications,
  applicationId,
  reminder,
  triggerLabel = reminder ? "Edit follow-up" : "Add follow-up",
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  applications?: Application[];
  applicationId?: string;
  reminder?: Reminder;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const selectedApplicationId = applicationId ?? reminder?.application_id;

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const selectedApplication = String(
      data.get("application_id") ?? selectedApplicationId ?? "",
    );
    const title = String(data.get("title") ?? "").trim();
    const localDate = String(data.get("due_at") ?? "");
    const description = String(data.get("description") ?? "").trim();

    if (!selectedApplication || !title || !localDate) {
      setError("Choose an application and add a title and due date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        application_id: selectedApplication,
        title,
        due_at: new Date(localDate).toISOString(),
        description: description || null,
      };
      if (reminder) {
        await updateReminder(reminder.id, payload);
      } else {
        await createReminder(payload);
      }
      setOpen(false);
      setSuccess(reminder ? "Follow-up updated" : "Follow-up added");
      router.refresh();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={reminder ? "Edit follow-up" : "Add a follow-up"}
        description="This will appear on your dashboard when it needs attention. No notification is sent."
      >
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(event.currentTarget);
          }}
        >
          {applications ? (
            <label className="block text-sm font-medium text-foreground">
              Application
              <select
                name="application_id"
                required
                defaultValue={selectedApplicationId ?? ""}
                className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="">Choose an application…</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input
              type="hidden"
              name="application_id"
              value={selectedApplicationId ?? ""}
            />
          )}
          <label className="block text-sm font-medium text-foreground">
            What do you need to do?
            <input
              name="title"
              required
              defaultValue={reminder?.title ?? "Follow up on application"}
              placeholder="Follow up with the recruiter"
              className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Due date and time
            <input
              type="datetime-local"
              name="due_at"
              required
              defaultValue={toLocalInput(reminder?.due_at)}
              className="mt-1.5 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Notes <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={reminder?.description ?? ""}
              placeholder="Add context, a contact name, or what to say…"
              className="mt-1.5 w-full resize-y rounded-control border border-border-strong bg-surface px-3 py-2 text-sm leading-6"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
              {saving ? "Saving…" : reminder ? "Save changes" : "Add follow-up"}
            </Button>
          </div>
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

function toLocalInput(value?: string): string {
  const date = value ? new Date(value) : defaultDueDate();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultDueDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(9, 0, 0, 0);
  return date;
}

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/^API \d+:\s*/, "") || "Could not save this follow-up.";
}
