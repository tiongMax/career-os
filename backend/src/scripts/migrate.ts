import path from "node:path";
import { Pool } from "pg";

import { loadConfig } from "../config/env.js";
import {
  loadMigrations,
  migrateDown,
  migrateUp,
  migrationStatus,
  prepareMigrationDatabase,
} from "../database/migrations.js";

const command = process.argv[2];
if (command !== "up" && command !== "down" && command !== "status") {
  console.error("usage: migrate <up|down|status>");
  process.exitCode = 2;
} else {
  await run(command);
}

async function run(command: "up" | "down" | "status"): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext('careeros_migrations'))",
    );
    await prepareMigrationDatabase(client);
    const migrations = await loadMigrations(await resolveMigrationsDirectory());
    if (command === "up") {
      const applied = await migrateUp(client, migrations);
      for (const migration of applied)
        console.log(
          `applied ${migration.version.toString()} ${migration.name}`,
        );
      if (!applied.length) console.log("database is up to date");
    } else if (command === "down") {
      const reverted = await migrateDown(client, migrations);
      console.log(
        reverted
          ? `reverted ${reverted.version.toString()} ${reverted.name}`
          : "database is already at version 0",
      );
    } else {
      const statuses = await migrationStatus(client, migrations);
      for (const { migration, applied } of statuses)
        console.log(
          `${applied ? "applied" : "pending"} ${migration.version.toString()} ${migration.name}`,
        );
    }
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtext('careeros_migrations'))")
      .catch(() => undefined);
    client.release();
    await pool.end();
  }
}

async function resolveMigrationsDirectory(): Promise<string> {
  const candidates = [
    path.resolve("migrations"),
    path.resolve("backend", "migrations"),
  ];
  for (const candidate of candidates) {
    try {
      await loadMigrations(candidate);
      return candidate;
    } catch (error) {
      if (!isMissingDirectory(error)) throw error;
    }
  }
  throw new Error(`migrations directory not found from ${process.cwd()}`);
}

function isMissingDirectory(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
