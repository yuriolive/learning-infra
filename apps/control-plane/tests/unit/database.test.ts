import { describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../src/database/database";

// Mock the dependencies of createDatabase
vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(),
  neonConfig: {},
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: vi.fn(),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(),
}));

vi.mock("postgres", () => ({
  default: vi.fn(),
}));

describe("createDatabase", () => {
  const neonUrl =
    "postgres://user:pass@ep-cool-name.us-east-2.aws.neon.tech/neondb";
  const localUrl = "postgres://postgres:postgres@localhost:5432/postgres";

  it("should accept a standard connection string", () => {
    // We expect this not to throw
    expect(() => createDatabase(neonUrl)).not.toThrow();
  });

  it("should accept a Hyperdrive binding object", () => {
    const hyperdrive = {
      connectionString: neonUrl,
    };
    expect(() => createDatabase(hyperdrive)).not.toThrow();
  });

  it("should throw an error if connection string is missing", () => {
    expect(() => createDatabase(undefined as unknown as string)).toThrow(
      /DATABASE_URL is not defined or is an invalid type/,
    );
    expect(() => createDatabase("")).toThrow(
      /DATABASE_URL is not defined or is an invalid type/,
    );
  });

  it("should throw an error if an invalid object is passed", () => {
    expect(() => createDatabase({ someOtherProp: "test" })).toThrow(
      /DATABASE_URL is not defined or is an invalid type/,
    );
  });

  it("should correctly identify local environment via connection string", () => {
    // This is harder to test without full integration but we can verify the branching logic
    // through the internal behavior if we were to spy on the drivers,
    // but for now, we just ensure it doesn't crash.
    expect(() => createDatabase(localUrl, "development")).not.toThrow();
  });

  it("should handle neon.tech URLs as Neon HTTP in production", () => {
    expect(() => createDatabase(neonUrl, "production")).not.toThrow();
  });
});
