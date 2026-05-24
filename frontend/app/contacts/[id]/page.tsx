import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";
import { getContact, getCompany } from "@/lib/api";
import { notFound } from "next/navigation";

const RELATIONSHIP_BADGE: Record<string, string> = {
  recruiter:      "bg-blue-50 text-blue-700",
  referral:       "bg-green-50 text-green-700",
  hiring_manager: "bg-purple-50 text-purple-700",
  interviewer:    "bg-orange-50 text-orange-700",
  connection:     "bg-neutral-100 text-neutral-600",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

export default async function ContactDetailPage(props: PageProps<"/contacts/[id]">) {
  const { id } = await props.params;

  const contact = await getContact(id).catch(() => null);
  if (!contact) notFound();

  const company = await getCompany(contact.company_id).catch(() => null);

  const initials = contact.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const colorClass = AVATAR_COLORS[contact.name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-4">
          <Link href="/contacts" className="hover:text-neutral-600 transition-colors">
            Contacts
          </Link>
          <span>/</span>
          <span className="text-neutral-600">{contact.name}</span>
        </div>

        <div className="flex items-center gap-4 mb-1">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 ${colorClass}`}>
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{contact.name}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {[contact.role, company?.name].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {contact.relationship && (
            <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${RELATIONSHIP_BADGE[contact.relationship] ?? "bg-neutral-100 text-neutral-600"}`}>
              {contact.relationship.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* Details card */}
      <Card title="Details">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Detail label="Company" value={company?.name} />
          <Detail label="Role" value={contact.role} />
          <Detail label="Relationship" value={contact.relationship?.replace(/_/g, " ")} />
        </dl>

        {(contact.email || contact.linkedin_url) && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap gap-3">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                {contact.email}
              </a>
            )}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                LinkedIn
              </a>
            )}
          </div>
        )}
      </Card>

      {contact.notes && (
        <Card title="Notes">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{contact.notes}</p>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="px-5 py-3.5 text-sm font-medium text-neutral-700 border-b border-neutral-100">{title}</h2>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-700 capitalize">{value ?? "—"}</dd>
    </div>
  );
}
