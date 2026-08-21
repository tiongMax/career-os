import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getApplication,
  getApplicationAuditLogs,
  getApplicationJobDescription,
  getCompanies,
  getResumeVersions,
  getRoleTracks,
} from "@/lib/api";
import { optionalEntity, requireEntity } from "@/lib/server-data";
import { EditApplicationForm } from "./form";

export default async function EditApplicationPage(
  props: PageProps<"/applications/[id]/edit">,
) {
  const { id } = await props.params;

  const [application, auditLogs, companies, resumes, tracks, jobDescription] =
    await Promise.all([
      requireEntity(getApplication(id)),
      getApplicationAuditLogs(id),
      getCompanies(),
      getResumeVersions(),
      getRoleTracks(),
      optionalEntity(getApplicationJobDescription(id)),
    ]);

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-400 mb-2">
          <Link
            href="/applications"
            className="hover:text-neutral-600 transition-colors"
          >
            Applications
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/applications/${id}`}
            className="hover:text-neutral-600 transition-colors"
          >
            {application.title}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-600">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Edit Application
        </h1>
      </div>
      <EditApplicationForm
        application={application}
        companies={companies}
        resumes={resumes}
        tracks={tracks}
        auditLogs={auditLogs}
        jobDescription={jobDescription}
      />
    </div>
  );
}
