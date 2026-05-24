import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCompanies } from "@/lib/api";
import { NewContactForm } from "./form";

export default async function NewContactPage() {
  const companies = await getCompanies().catch(() => []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-2">
          <Link href="/contacts" className="hover:text-neutral-600 transition-colors">
            Contacts
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-600">New</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">New Contact</h1>
        <p className="mt-1 text-sm text-neutral-500">Add a new contact to your network</p>
      </div>
      <NewContactForm companies={companies} />
    </div>
  );
}
