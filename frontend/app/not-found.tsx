import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <SearchX className="h-5 w-5" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          This record doesn&rsquo;t exist
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          It may have been deleted, or the link may be outdated.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
