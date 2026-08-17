import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonGroup({
  children,
  className,
  label = "Loading content",
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      data-slot="skeleton-group"
      role="status"
      className={cn("space-y-3", className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
