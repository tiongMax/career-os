import { getContacts, getCompanies } from "@/lib/api";
import { Users } from "lucide-react";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

const RELATIONSHIP_BADGE: Record<string, string> = {
  recruiter:      "bg-blue-50 text-blue-700",
  referral:       "bg-green-50 text-green-700",
  hiring_manager: "bg-purple-50 text-purple-700",
  interviewer:    "bg-orange-50 text-orange-700",
  connection:     "bg-neutral-100 text-neutral-600",
};

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    getContacts().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Contacts</h1>
        <p className="mt-1 text-sm text-neutral-500">{contacts.length} total</p>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-20 text-center">
          <Users className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No contacts yet</p>
          <p className="text-xs text-neutral-400 mt-1">Contacts from your applications will appear here</p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Company</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Relationship</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contacts.map((contact) => {
                const initials = contact.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                const colorClass = AVATAR_COLORS[contact.name.charCodeAt(0) % AVATAR_COLORS.length];
                return (
                  <tr key={contact.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${colorClass}`}>
                          {initials}
                        </div>
                        <span className="font-medium text-neutral-800">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">{contact.role ?? "—"}</td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {companyMap.get(contact.company_id) ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline text-xs">
                          {contact.email}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact.relationship ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${RELATIONSHIP_BADGE[contact.relationship] ?? "bg-neutral-100 text-neutral-600"}`}>
                          {contact.relationship.replace(/_/g, " ")}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
