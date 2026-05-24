import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NewResumeForm } from "./form";

export default function NewResumeVersionPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-2">
          <Link href="/resume-versions" className="hover:text-neutral-600 transition-colors">
            Resumes
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-600">New</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">New Resume Version</h1>
        <p className="mt-1 text-sm text-neutral-500">Add a new resume version to your library</p>
      </div>
      <NewResumeForm />
    </div>
  );
}
