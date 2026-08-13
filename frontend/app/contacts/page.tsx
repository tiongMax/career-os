import { getContacts, getCompanies } from "@/lib/api";
import { Users } from "lucide-react";
import Link from "next/link";
import { ContactsTable } from "./contacts-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([
    getContacts(),
    getCompanies(),
  ]);

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  if (contacts.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Contacts"
          description="People who can help move your applications forward."
          actions={
            <Button asChild>
              <Link href="/contacts/new">New contact</Link>
            </Button>
          }
        />
        <EmptyState
          icon={Users}
          title="Build your job-search network"
          description="Add recruiters, hiring managers, and referrals so every relationship has useful context."
          actions={
            <Button asChild>
              <Link href="/contacts/new">Add your first contact</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ContactsTable contacts={contacts} companyMap={companyMap} />
    </div>
  );
}
