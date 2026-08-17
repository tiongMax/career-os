import { sql } from "drizzle-orm";
import type { SearchRepository, SearchResult } from "./search.service.js";
import type { Database } from "../../database/client.js";

export function createSearchRepository(database: Database): SearchRepository {
  return {
    async search(query) {
      const result = await database.execute<
        SearchResult & Record<string, unknown>
      >(sql`
      SELECT 'application' AS type, a.id::text AS id, a.title, c.name AS company,
        ts_rank(a.search_vector, plainto_tsquery('english', ${query}))::float8 AS rank
      FROM applications a JOIN companies c ON c.id = a.company_id
      WHERE a.search_vector @@ plainto_tsquery('english', ${query})
      UNION ALL
      SELECT 'job_description', a.id::text, a.title, c.name,
        ts_rank(jd.search_vector, plainto_tsquery('english', ${query}))::float8
      FROM job_descriptions jd JOIN applications a ON a.id = jd.application_id
      JOIN companies c ON c.id = a.company_id
      WHERE jd.search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC LIMIT 30`);
      return result.rows;
    },
  };
}
