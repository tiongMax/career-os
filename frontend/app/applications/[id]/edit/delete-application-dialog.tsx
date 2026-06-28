"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";

export function DeleteApplicationToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-6 top-6 z-50 flex w-[min(24rem,calc(100vw-3rem))] animate-fade-in items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">Could not delete application</p>
        <p className="mt-0.5 break-words text-xs text-neutral-500">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-950/40 px-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-application-title" className="w-full max-w-md animate-fade-in rounded-lg border border-neutral-200 bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <h2 id="delete-application-title" className="text-base font-semibold text-neutral-900">Delete application?</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {`This will permanently delete "${title}" and its related application data.`}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:border-neutral-400 hover:text-neutral-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
