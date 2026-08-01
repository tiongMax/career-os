import { describe, expect, it } from "vitest";

import { hasPostgresCode } from "./errors.js";

describe("hasPostgresCode", () => {
  it("finds SQLSTATE codes through Drizzle error causes", () => {
    const postgresError = Object.assign(new Error("duplicate"), { code: "23505" });
    const drizzleError = new Error("query failed", { cause: postgresError });

    expect(hasPostgresCode(drizzleError, "23505")).toBe(true);
    expect(hasPostgresCode(drizzleError, "23503")).toBe(false);
  });

  it("terminates safely when an error cause is cyclic", () => {
    const error: Error & { cause?: unknown } = new Error("cyclic");
    error.cause = error;

    expect(hasPostgresCode(error, "23505")).toBe(false);
  });
});
