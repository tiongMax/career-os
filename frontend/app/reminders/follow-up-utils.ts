import type { Reminder } from "@/lib/api";

const timeZone = "Asia/Kuala_Lumpur";

export type FollowUpGroup = "overdue" | "today" | "upcoming" | "completed";

export function followUpGroup(reminder: Reminder, now = new Date()): FollowUpGroup {
  if (reminder.status === "cancelled" || reminder.status === "sent") {
    return "completed";
  }
  const due = new Date(reminder.due_at);
  if (due.getTime() < now.getTime()) return "overdue";
  return dateKey(due) === dateKey(now) ? "today" : "upcoming";
}

export function formatFollowUpDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
