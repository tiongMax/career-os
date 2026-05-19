import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  recruiter_screen: "bg-purple-100 text-purple-700",
  technical_screen: "bg-indigo-100 text-indigo-700",
  onsite: "bg-orange-100 text-orange-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-neutral-100 text-neutral-500",
};

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  recruiter_screen: "Recruiter Screen",
  technical_screen: "Technical Screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-600"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
