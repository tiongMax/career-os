import Link from "next/link";
import { SearchForm } from "./search-form";

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = (await props.searchParams) as { q?: string };

  let results: SearchResult[] = [];
  let error: string | null = null;

  if (q) {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
      const res = await fetch(`${base}/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        results = data.results ?? [];
      }
    } catch {
      error = "Search unavailable. Please try again later.";
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Search</h1>
        <p className="mt-1 text-sm text-neutral-500">Search across applications, companies, job descriptions, and resumes</p>
      </div>

      <SearchForm defaultValue={q} />

      {error && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {q && results.length === 0 && !error && (
        <p className="text-sm text-neutral-400">No results for &ldquo;{q}&rdquo;</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">{results.length} results for &ldquo;{q}&rdquo;</p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id} className="rounded-lg border border-neutral-200 bg-white px-5 py-4">
                <Link href={"/applications/" + r.id} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{r.title}</p>
                      {r.company && <p className="text-xs text-neutral-400 mt-0.5">{r.company}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs rounded-full bg-neutral-100 text-neutral-500 px-2 py-0.5 capitalize">{r.type}</span>
                      {r.rank && <p className="text-xs text-neutral-400 mt-1">rank {r.rank.toFixed(2)}</p>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  company?: string;
  rank?: number;
}
