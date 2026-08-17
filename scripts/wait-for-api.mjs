const port = process.env.API_PORT ?? "8080";
const healthUrl = `http://127.0.0.1:${port}/api/v1/health`;
const timeoutMs = Number(process.env.API_WAIT_TIMEOUT_MS ?? 60_000);
const retryMs = 250;
const deadline = Date.now() + timeoutMs;

console.log(`Waiting for API readiness at ${healthUrl}`);

while (Date.now() < deadline) {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
    if (response.ok) {
      const health = await response.json();
      if (health.status === "ok") {
        console.log("API is ready");
        process.exit(0);
      }
    }
  } catch {
    // The API may still be binding its port or connecting to its dependencies.
  }

  await new Promise((resolve) => setTimeout(resolve, retryMs));
}

console.error(`API did not become ready within ${timeoutMs}ms`);
process.exit(1);
