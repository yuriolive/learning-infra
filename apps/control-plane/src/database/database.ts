import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { type PgliteDatabase } from "drizzle-orm/pglite";
import {
  drizzle as drizzlePg,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

const getConnectionString = (rawConnectionString: unknown): string => {
  const connectionString =
    typeof rawConnectionString === "string"
      ? rawConnectionString
      : rawConnectionString &&
          typeof rawConnectionString === "object" &&
          "connectionString" in rawConnectionString &&
          typeof rawConnectionString.connectionString === "string"
        ? rawConnectionString.connectionString
        : "";

  if (!connectionString) {
    const errorMessage =
      "DATABASE_URL is not defined or is an invalid type. " +
      "Ensure it is set as an environment variable (string) or a Hyperdrive binding.";
    throw new Error(errorMessage);
  }

  return connectionString;
};

export const createDatabase = (
  rawConnectionString: unknown,
  nodeEnvironment: string = "production",
): Database => {
  const connectionString = getConnectionString(rawConnectionString);

  /**
   * For the control plane, we switch between drivers based on the environment:
   * - Neon HTTP (drizzleHttp): Used in production/cloud environments to minimize
   *   cold starts and avoid WebSocket overhead for serverless functions.
   * - Postgres-JS (drizzlePg): Used for local development and CI to provide
   *   a standard TCP connection to local PostgreSQL instances.
   */
  const useNeonHttp =
    connectionString.includes("neon.tech") || nodeEnvironment === "production";

  if (useNeonHttp) {
    return drizzleHttp(neon(connectionString), { schema });
  }

  return drizzlePg(postgres(connectionString), { schema });
};
