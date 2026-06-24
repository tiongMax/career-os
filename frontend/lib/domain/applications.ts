import type { Option } from "@/components/ui/option-combobox";

export const APPLICATION_STATUS_OPTIONS: Option[] = [
  { value: "saved", label: "Saved", dot: "bg-slate-400" },
  { value: "applied", label: "Applied", dot: "bg-blue-500" },
  { value: "online_assessment", label: "Online Assessment", dot: "bg-cyan-500" },
  { value: "recruiter_screen", label: "Recruiter Screen", dot: "bg-purple-500" },
  { value: "technical_screen", label: "Technical Screen 1", dot: "bg-indigo-500" },
  { value: "technical_screen_2", label: "Technical Screen 2", dot: "bg-indigo-500" },
  { value: "technical_screen_3", label: "Technical Screen 3", dot: "bg-indigo-500" },
  { value: "technical_screen_4", label: "Technical Screen 4", dot: "bg-indigo-500" },
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
  online_assessment: "bg-cyan-100 text-cyan-700",
  recruiter_screen: "bg-purple-100 text-purple-700",
  technical_screen: "bg-indigo-100 text-indigo-700",
  technical_screen_2: "bg-indigo-100 text-indigo-700",
  technical_screen_3: "bg-indigo-100 text-indigo-700",
  technical_screen_4: "bg-indigo-100 text-indigo-700",
  onsite: "bg-orange-100 text-orange-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-neutral-100 text-neutral-500",
};

export const APPLICATION_STATUS_CHART_COLORS: Record<string, string> = {
  saved: "#94a3b8",
  applied: "#3b82f6",
  online_assessment: "#06b6d4",
  recruiter_screen: "#8b5cf6",
  technical_screen: "#6366f1",
  technical_screen_2: "#4f46e5",
  technical_screen_3: "#4338ca",
  technical_screen_4: "#3730a3",
  onsite: "#f97316",
  offer: "#22c55e",
  rejected: "#ef4444",
  withdrawn: "#737373",
};

const TECHNICAL_SCREEN_STATUSES = new Set([
  "technical_screen",
  "technical_screen_2",
  "technical_screen_3",
  "technical_screen_4",
]);

const RECEIVED_DATE_STATUSES = new Set([
  "online_assessment",
  "recruiter_screen",
  "onsite",
  "offer",
  "rejected",
]);

const COMPLETION_DATE_STATUSES = new Set([
  "online_assessment",
  "onsite",
]);

export function isTechnicalScreenStatus(status: string): boolean {
  return TECHNICAL_SCREEN_STATUSES.has(status);
}

export function statusHasReceivedDate(status: string): boolean {
  return RECEIVED_DATE_STATUSES.has(status) || isTechnicalScreenStatus(status);
}

export function statusHasCompletionDate(status: string): boolean {
  return COMPLETION_DATE_STATUSES.has(status) || isTechnicalScreenStatus(status);
}

export const TRACK_BADGE_CLASSES: Record<string, string> = {
  backend: "bg-blue-50 text-blue-700",
  ai: "bg-purple-50 text-purple-700",
  quant: "bg-amber-50 text-amber-700",
  general: "bg-neutral-100 text-neutral-600",
  fullstack: "bg-cyan-50 text-cyan-700",
  platform: "bg-indigo-50 text-indigo-700",
};

export const TRACK_LABELS: Record<string, string> = {
  ai: "AI",
};

export const HIDDEN_TRACKS = new Set(["decode-probe-track"]);

export function formatTrackLabel(track: string): string {
  return TRACK_LABELS[track] ?? track.charAt(0).toUpperCase() + track.slice(1);
}

export function isVisibleTrack(track: string): boolean {
  return !HIDDEN_TRACKS.has(track);
}
