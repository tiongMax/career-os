import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-neutral-100 text-neutral-800",
        variant === "outline" && "border border-neutral-200 text-neutral-600",
        className
      )}
    >
      {children}
    </span>
  );
}
