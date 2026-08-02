import { describe, expect, it } from "vitest";

import { parseMigration } from "./migrations.js";

describe("migration parser", () => {
  it("extracts Goose-compatible up and down SQL", () => {
    expect(
      parseMigration(`-- +goose Up
CREATE TABLE example (id INT);

-- +goose Down
DROP TABLE example;`),
    ).toEqual({
      up: "CREATE TABLE example (id INT);",
      down: "DROP TABLE example;",
    });
  });

  it("rejects incomplete migration files", () => {
    expect(() => parseMigration("-- +goose Up\nSELECT 1;")).toThrow(
      "must contain ordered goose Up and Down sections",
    );
  });
});
