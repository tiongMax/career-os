import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

const relativeDateFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "—";

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayNumber = (date: Date) => {
    const parts = dateParts.formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(value("year"), value("month") - 1, value("day"));
  };
  const targetDay = dayNumber(target);
  const currentDay = dayNumber(new Date());
  const days = Math.round((targetDay - currentDay) / 86_400_000);

  if (Math.abs(days) < 30) {
    return relativeDateFormatter.format(days, "day");
  }
  return formatDate(iso);
}
