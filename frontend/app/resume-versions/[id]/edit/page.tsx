import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getResumeVersion } from "@/lib/api";
import { EditResumeForm } from "./form";

export default async function EditResumeVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await getResumeVersion(id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-2">
          <Link href="/resume-versions" className="hover:text-neutral-600 transition-colors">
            Resumes
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-600">{resume.name}</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Edit Resume</h1>
        <p className="mt-1 text-sm text-neutral-500">Update your resume version details</p>
      </div>
      <EditResumeForm resume={resume} />
    </div>
  );
}
