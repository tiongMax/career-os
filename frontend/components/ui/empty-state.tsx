import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = React.ComponentProps<"div"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({
  actions,
  className,
  compact = false,
  description,
  icon: Icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface px-5 text-center",
        compact ? "py-8" : "py-14 sm:py-16",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </div>
      )}
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
