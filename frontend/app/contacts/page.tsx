import Link from "next/link";
import { getContacts, getCompanies } from "@/lib/api";
import { Users } from "lucide-react";
import { ContactsTable } from "./contacts-table";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    getContacts().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Contacts</h1>
        <Link
          href="/contacts/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors whitespace-nowrap"
        >
          + New Contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white py-20 text-center">
          <Users className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No contacts yet</p>
          <p className="text-xs text-neutral-400 mt-1">Contacts from your applications will appear here</p>
        </div>
      ) : (
        <ContactsTable contacts={contacts} companyMap={companyMap} />
      )}
    </div>
  );
}
