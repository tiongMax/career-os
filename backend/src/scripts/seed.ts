import { loadConfig } from "../config/env.js";
import { createPostgres } from "../database/client.js";
import { seedDemoData } from "../database/seed.js";

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
