import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { seedDemoData } from "../seed/seed.js";

const config = loadConfig();
const postgres = createPostgres(config.DATABASE_URL);

try {
  await postgres.ping();
  const summary = await seedDemoData(postgres.db);
  if (!summary) console.log("already seeded — found existing companies");
  else console.log(JSON.stringify({ message: "seed complete", ...summary }));
} finally {
  await postgres.close();
}
