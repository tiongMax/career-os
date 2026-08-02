import { performance } from "node:perf_hooks";

const API_URL = process.env.BASE_URL || "http://localhost:8080/api/v1";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const RUNS = Number.parseInt(process.env.RUNS || "10", 10);

async function request(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  await response.json();
  return response.headers.get("x-cache");
}

async function legacyDashboardLoad() {
  await Promise.all([
    request("/analytics/summary"),
    request("/applications"),
    request("/companies"),
    request("/reminders"),
    request("/analytics/upcoming"),
  ]);
}

async function optimizedDashboardLoad() {
  return request("/dashboard");
}

async function frontendDashboardLoad() {
  const response = await fetch(`${FRONTEND_URL}/dashboard`);
  if (!response.ok)
    throw new Error(`/dashboard page returned ${response.status}`);
  await response.arrayBuffer();
}

async function measure(name, operation) {
  await operation();
  const durations = [];
  const cacheStatuses = [];
  for (let index = 0; index < RUNS; index += 1) {
    const started = performance.now();
    cacheStatuses.push(await operation());
    durations.push(performance.now() - started);
  }
  durations.sort((left, right) => left - right);
  const average =
    durations.reduce((total, value) => total + value, 0) / durations.length;
  const percentile = (fraction) =>
    durations[
      Math.min(durations.length - 1, Math.ceil(durations.length * fraction) - 1)
    ];
  console.log(
    JSON.stringify({
      name,
      runs: RUNS,
      average_ms: Number(average.toFixed(2)),
      median_ms: Number(percentile(0.5).toFixed(2)),
      p95_ms: Number(percentile(0.95).toFixed(2)),
      min_ms: Number(durations[0].toFixed(2)),
      max_ms: Number(durations.at(-1).toFixed(2)),
      cache_statuses: [...new Set(cacheStatuses.filter(Boolean))],
    }),
  );
}

await measure("legacy_api_fanout", legacyDashboardLoad);
await measure("optimized_dashboard_api", optimizedDashboardLoad);
try {
  await measure("optimized_dashboard_page", frontendDashboardLoad);
} catch (error) {
  console.warn(`frontend measurement skipped: ${error.message}`);
}
