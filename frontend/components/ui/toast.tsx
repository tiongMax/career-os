"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toast({
  title,
  description,
  variant = "info",
  onClose,
}: {
  title: string;
  description?: string;
  variant?: ToastVariant;
  onClose?: () => void;
}) {
  const Icon = toastIcons[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-sm animate-fade-in items-start gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-elevated sm:left-auto sm:right-6 sm:mx-0"
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          variant === "success" && "text-success",
          variant === "error" && "text-danger",
          variant === "info" && "text-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded-control p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
