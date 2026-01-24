import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";

import * as schema from "./schema";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export const createDatabase = (
  rawConnectionString: unknown,
  nodeEnvironment: string = "production",
): Database => {
  // Handle Cloudflare Hyperdrive or other Service Binding objects
  let connectionString = "";

  if (typeof rawConnectionString === "string") {
    connectionString = rawConnectionString;
  } else if (
    rawConnectionString &&
    typeof rawConnectionString === "object" &&
    "connectionString" in rawConnectionString &&
    typeof rawConnectionString.connectionString === "string"
  ) {
    // Hyperdrive binding exposes .connectionString
    connectionString = rawConnectionString.connectionString;
  }

  if (!connectionString) {
    const errorMessage =
      "DATABASE_URL is not defined or is an invalid type. " +
      "Ensure it is set as an environment variable (string) or a Hyperdrive binding.";
    throw new Error(errorMessage);
  }

  const isLocal =
    nodeEnvironment === "development" ||
    connectionString.includes("localhost") ||
    connectionString.includes("db.localtest.me");

  // For local development using the Neon proxy, this block intercepts the Neon
  // serverless driver's HTTP requests and redirects them to the local proxy
  // instance (running on port 4444). This allows us to use the same production
  // driver (`@neondatabase/serverless`) in a local environment against a
  // standard PostgreSQL database, ensuring consistency between environments.
  if (isLocal && connectionString.includes("db.localtest.me")) {
    neonConfig.fetchEndpoint = (host) => {
      const [protocol, port] =
        host === "db.localtest.me" ? ["http", 4444] : ["https", 443];
      return `${protocol}://${host}:${port}/sql`;
    };
    const connectionStringUrl = new URL(connectionString);
    neonConfig.useSecureWebSocket =
      connectionStringUrl.hostname !== "db.localtest.me";
    neonConfig.wsProxy = (host) =>
      host === "db.localtest.me" ? `${host}:4444/v2` : `${host}/v2`;
  }

  if (nodeEnvironment !== "production") {
    neonConfig.webSocketConstructor = ws;
  }

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
