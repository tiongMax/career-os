import type { Option } from "@/components/ui/option-combobox";

export const APPLICATION_STATUS_OPTIONS: Option[] = [
  { value: "saved", label: "Saved", dot: "bg-slate-400" },
  { value: "applied", label: "Applied", dot: "bg-blue-500" },
  { value: "recruiter_screen", label: "Recruiter Screen", dot: "bg-purple-500" },
  { value: "technical_screen", label: "Technical Screen", dot: "bg-indigo-500" },
  { value: "onsite", label: "Onsite", dot: "bg-orange-500" },
  { value: "offer", label: "Offer", dot: "bg-green-500" },
  { value: "rejected", label: "Rejected", dot: "bg-red-500" },
  { value: "withdrawn", label: "Withdrawn", dot: "bg-neutral-400" },
];

export const APPLICATION_STATUS_ORDER = APPLICATION_STATUS_OPTIONS.map((option) => option.value);

export const APPLICATION_STATUS_LABELS = Object.fromEntries(
  APPLICATION_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>;

export const APPLICATION_STATUS_BADGE_CLASSES: Record<string, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  recruiter_screen: "bg-purple-100 text-purple-700",
  technical_screen: "bg-indigo-100 text-indigo-700",
  onsite: "bg-orange-100 text-orange-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-neutral-100 text-neutral-500",
};

export const APPLICATION_STATUS_CHART_COLORS: Record<string, string> = {
  saved: "#94a3b8",
  applied: "#3b82f6",
  recruiter_screen: "#8b5cf6",
  technical_screen: "#6366f1",
  onsite: "#f97316",
  offer: "#22c55e",
  rejected: "#ef4444",
  withdrawn: "#737373",
};

export const TRACK_BADGE_CLASSES: Record<string, string> = {
  backend: "bg-blue-50 text-blue-700",
  ai: "bg-purple-50 text-purple-700",
  quant: "bg-amber-50 text-amber-700",
  general: "bg-neutral-100 text-neutral-600",
  fullstack: "bg-cyan-50 text-cyan-700",
  platform: "bg-indigo-50 text-indigo-700",
};
