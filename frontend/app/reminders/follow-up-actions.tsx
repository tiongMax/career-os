"use client";

import { Check, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { completeReminder, deleteReminder } from "@/lib/api";

export function FollowUpActions({
  reminderId,
  compact = false,
  redirectAfterDelete = false,
}: {
  reminderId: string;
  compact?: boolean;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [working, setWorking] = useState<"complete" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function complete() {
    setWorking("complete");
    setError(null);
    try {
      await completeReminder(reminderId);
      setSuccess("Follow-up completed");
      router.refresh();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setWorking(null);
    }
  }

  async function remove() {
    setWorking("delete");
    setError(null);
    try {
      await deleteReminder(reminderId);
      setConfirmDelete(false);
      if (redirectAfterDelete) router.push("/reminders");
      else router.refresh();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size={compact ? "sm" : "default"}
          onClick={() => void complete()}
          disabled={working !== null}
        >
          {working === "complete" ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Mark done
        </Button>
        {!compact && (
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={working !== null}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Dialog
        open={confirmDelete}
        onClose={() => working === null && setConfirmDelete(false)}
        title="Delete this follow-up?"
        description="This removes it permanently from CareerOS."
      >
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(false)}
            disabled={working !== null}
          >
            Keep follow-up
          </Button>
          <Button
            variant="danger"
            onClick={() => void remove()}
            disabled={working !== null}
          >
            {working === "delete" && (
              <Loader2 aria-hidden="true" className="animate-spin" />
            )}
            Delete
          </Button>
        </div>
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

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.replace(/^API \d+:\s*/, "") || "Could not update this follow-up.";
}
