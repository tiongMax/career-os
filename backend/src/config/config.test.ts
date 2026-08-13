import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("applies local development defaults", () => {
    const config = loadConfig({});

    expect(config.API_PORT).toBe(8080);
    expect(config.APP_ENV).toBe("development");
    expect(config.DASHBOARD_CACHE_TTL_SECONDS).toBe(60);
    expect(config.LOG_PRETTY).toBe(true);
  });

  it("uses JSON logs outside development unless explicitly overridden", () => {
    expect(loadConfig({ APP_ENV: "production" }).LOG_PRETTY).toBe(false);
    expect(
      loadConfig({ APP_ENV: "production", LOG_PRETTY: "true" }).LOG_PRETTY,
    ).toBe(true);
  });

  it("coerces numeric environment variables", () => {
    const config = loadConfig({ API_PORT: "9090", GEMINI_TIMEOUT_MS: "5000" });

    expect(config.API_PORT).toBe(9090);
    expect(config.GEMINI_TIMEOUT_MS).toBe(5000);
  });

  it("rejects malformed configuration", () => {
    expect(() => loadConfig({ API_PORT: "not-a-port" })).toThrow();
    expect(() => loadConfig({ DASHBOARD_CACHE_TTL_SECONDS: "0" })).toThrow();
  });
});
