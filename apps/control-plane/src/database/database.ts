import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isLocal =
  process.env.NODE_ENV === "development" ||
  connectionString.includes("localhost") ||
  connectionString.includes("db.localtest.me");

// Configuring Neon for local development via Neon Proxy
// This redirects Neon's SDK to the local proxy endpoint (usually running on port 4444)
// to allow testing Neon-specific features locally.
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

neonConfig.webSocketConstructor = ws;

/**
 * For the control plane, we switch between drivers based on the environment:
 * - Neon HTTP (drizzleHttp): Used in production/cloud environments to minimize
 *   cold starts and avoid WebSocket overhead for serverless functions.
 * - Postgres-JS (drizzlePg): Used for local development and CI to provide
 *   a standard TCP connection to local PostgreSQL instances.
 */
const useNeonHttp =
  connectionString.includes("neon.tech") ||
  process.env.NODE_ENV === "production";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export const database = useNeonHttp
  ? drizzleHttp(neon(connectionString), { schema })
  : drizzlePg(postgres(connectionString), { schema });
