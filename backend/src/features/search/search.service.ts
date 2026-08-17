export interface SearchResult {
  type: string;
  id: string;
  title: string;
  company: string | null;
  rank: number;
}
export interface SearchRepository {
  search: (query: string) => Promise<SearchResult[]>;
}
export type SearchService = SearchRepository;
export function createSearchService(
  repository: SearchRepository,
): SearchService {
  return {
    search: (query) =>
      query.trim() === "" ? Promise.resolve([]) : repository.search(query),
  };
}
