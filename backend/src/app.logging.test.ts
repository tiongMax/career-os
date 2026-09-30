import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("request correlation and logging", () => {
  it("echoes bounded safe request IDs and keeps query values out of completion logs", async () => {
    const logs: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });
    const app = await buildApp({
      logger: { level: "info", stream },
      healthChecks: { postgres: async () => {}, redis: async () => {} },
    });
    apps.push(app);
    const response = await app.inject({
      url: "/api/v1/health?search=private-search&token=private-token",
      headers: { "x-request-id": "client-request-42" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("client-request-42");
    const output = logs.join("");
    expect(output).toContain('"reqId":"client-request-42"');
    expect(output).toContain('"path":"/api/v1/health"');
    expect(output).not.toContain("private-search");
    expect(output).not.toContain("private-token");
  });

  it.each([undefined, "x".repeat(65), "client id with spaces"])(
    "generates a server request ID when the supplied ID is missing or unsafe",
    async (id) => {
      const app = await buildApp({
        logger: false,
        healthChecks: { postgres: async () => {}, redis: async () => {} },
      });
      apps.push(app);
      const response = await app.inject({
        url: "/api/v1/health",
        ...(id === undefined ? {} : { headers: { "x-request-id": id } }),
      });
      expect(response.headers["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );
});
