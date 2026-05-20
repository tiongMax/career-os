export default function ApplicationsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-md bg-neutral-200 animate-pulse" />
          <div className="h-4 w-16 rounded-md bg-neutral-100 animate-pulse" />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search bar */}
          <div className="h-8 w-56 rounded-md bg-neutral-200 animate-pulse" />
          {/* Filter buttons */}
          {["w-24", "w-20", "w-20", "w-20"].map((w, i) => (
            <div key={i} className={`h-8 ${w} rounded-md bg-neutral-200 animate-pulse`} />
          ))}
          {/* New Application button */}
          <div className="h-9 w-36 rounded-md bg-neutral-200 animate-pulse" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {/* Header row */}
        <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3 flex gap-8">
          {["w-32", "w-28", "w-16", "w-20", "w-16"].map((w, i) => (
            <div key={i} className={`h-3 ${w} rounded bg-neutral-200 animate-pulse`} />
          ))}
        </div>

        {/* Data rows */}
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow({ index }: { index: number }) {
  const widths = [
    ["w-48", "w-28", "w-16", "w-20", "w-12"],
    ["w-40", "w-32", "w-14", "w-24", "w-14"],
    ["w-52", "w-24", "w-18", "w-16", "w-10"],
    ["w-36", "w-36", "w-16", "w-28", "w-12"],
    ["w-44", "w-20", "w-14", "w-20", "w-14"],
  ];
  const [role, company, track, status, applied] = widths[index % widths.length];

  return (
    <div className="px-5 py-3.5 flex items-center gap-8">
      <div className={`h-4 ${role} rounded bg-neutral-100 animate-pulse`} />
      <div className={`h-4 ${company} rounded bg-neutral-100 animate-pulse`} />
      <div className={`h-5 ${track} rounded-full bg-neutral-100 animate-pulse`} />
      <div className={`h-5 ${status} rounded-full bg-neutral-100 animate-pulse`} />
      <div className={`h-3 ${applied} rounded bg-neutral-100 animate-pulse`} />
    </div>
  );
}
