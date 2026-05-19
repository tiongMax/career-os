import { getContacts, getCompanies } from "@/lib/api";

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
        <p className="mt-1 text-sm text-neutral-500">
          {contacts.length} total
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-400">No contacts yet.</p>
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
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-neutral-800">{contact.name}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700">{contact.role ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700">
                    {companyMap.get(contact.company_id) ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-700">{contact.email ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700 capitalize">
                    {contact.relationship ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
