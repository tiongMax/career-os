import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getContact, getCompanies } from "@/lib/api";
import { notFound } from "next/navigation";
import { EditContactForm } from "./form";

export default async function EditContactPage(props: PageProps<"/contacts/[id]/edit">) {
  const { id } = await props.params;

  const [contact, companies] = await Promise.all([
    getContact(id).catch(() => null),
    getCompanies().catch(() => []),
  ]);

  if (!contact) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-2">
          <Link href="/contacts" className="hover:text-neutral-600 transition-colors">
            Contacts
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/contacts/${id}`} className="hover:text-neutral-600 transition-colors">
            {contact.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-600">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Edit Contact</h1>
      </div>
      <EditContactForm contact={contact} companies={companies} />
    </div>
  );
}
