import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../persistence/postgres/schema.js";

export type Database = NodePgDatabase<typeof schema>;

export interface Postgres {
  readonly db: Database;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function createPostgres(databaseUrl: string): Postgres {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    db: drizzle(pool, { schema }),
    async ping() {
      await pool.query("SELECT 1");
    },
    async close() {
      await pool.end();
    },
  };
}
