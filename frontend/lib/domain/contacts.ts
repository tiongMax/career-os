export const RELATIONSHIP_OPTIONS = [
  { value: "recruiter", label: "Recruiter" },
  { value: "referral", label: "Referral" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "interviewer", label: "Interviewer" },
  { value: "connection", label: "Connection" },
];

export const RELATIONSHIP_BADGE_CLASSES: Record<string, string> = {
  recruiter: "bg-blue-50 text-blue-700",
  referral: "bg-green-50 text-green-700",
  hiring_manager: "bg-purple-50 text-purple-700",
  interviewer: "bg-orange-50 text-orange-700",
  connection: "bg-neutral-100 text-neutral-600",
};
