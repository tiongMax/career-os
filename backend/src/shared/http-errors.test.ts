import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp() {
  const app = await buildApp({
    logger: false,
    healthChecks: { postgres: async () => {}, redis: async () => {} },
  });
  app.post("/test-body", () => Promise.resolve({ ok: true }));
  apps.push(app);
  return app;
}

describe("HTTP error handling", () => {
  it.each(["{", ""])(
    "returns 400 for malformed or empty JSON (%j)",
    async (payload) => {
      const app = await createApp();
      const response = await app.inject({
        method: "POST",
        url: "/test-body",
        headers: { "content-type": "application/json" },
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "invalid JSON body" });
    },
  );

  it("returns 413 for oversized JSON and 415 for unsupported media", async () => {
    const app = await createApp();
    const large = await app.inject({
      method: "POST",
      url: "/test-body",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ text: "x".repeat(1024 * 1024) }),
    });
    expect(large.statusCode).toBe(413);
    expect(large.json()).toEqual({ error: "request body too large" });
    const unsupported = await app.inject({
      method: "POST",
      url: "/test-body",
      headers: { "content-type": "application/xml" },
      payload: "<test/>",
    });
    expect(unsupported.statusCode).toBe(415);
    expect(unsupported.json()).toEqual({ error: "unsupported media type" });
  });

  it("does not expose unexpected error details or trust arbitrary status codes", async () => {
    const app = await createApp();
    app.get("/test-failure", () =>
      Promise.reject(
        Object.assign(new Error("private connection details"), {
          statusCode: 400,
        }),
      ),
    );
    const response = await app.inject({ url: "/test-failure" });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "internal server error" });
  });

  it("uses a resource-neutral message for foreign-key failures", async () => {
    const app = await createApp();
    app.get("/test-foreign-key", () =>
      Promise.reject(
        Object.assign(new Error("private constraint name"), {
          code: "23503",
        }),
      ),
    );
    const response = await app.inject({ url: "/test-foreign-key" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "referenced resource does not exist",
    });
  });
});
