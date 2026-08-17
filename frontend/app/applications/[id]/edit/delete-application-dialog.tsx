"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";

export function DeleteApplicationToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return <Toast title="Could not delete application" description={message} variant="error" onClose={onClose} />;
}

export function DeleteApplicationDialog({
  title,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open
      onClose={deleting ? () => undefined : onCancel}
      title="Delete application?"
      description={`This will permanently delete “${title}” and its related application data.`}
    >
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={deleting}>
          <Trash2 aria-hidden="true" />
          {deleting ? "Deleting..." : "Delete application"}
        </Button>
      </div>
    </Dialog>
  );
}
