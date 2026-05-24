"use client";

import { Download } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const EXPORTS = [
  {
    label: "Applications",
    href: `${BASE}/exports/applications.csv`,
    filename: "applications.csv",
    description: "All applications with company names and statuses",
  },
  {
    label: "Contacts",
    href: `${BASE}/exports/contacts.csv`,
    filename: "contacts.csv",
    description: "Recruiter and referral contacts",
  },
  {
    label: "Reminders",
    href: `${BASE}/exports/reminders.csv`,
    filename: "reminders.csv",
    description: "Follow-up reminders and delivery status",
  },
];

export function ExportSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Export Data</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {EXPORTS.map(({ label, href, filename, description }) => (
          <a
            key={label}
            href={href}
            download={filename}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3.5 hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
          >
            <Download className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
            <div>
              <p className="text-sm font-medium text-neutral-800">{label}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
