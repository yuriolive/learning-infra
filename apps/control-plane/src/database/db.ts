import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";

import * as schema from "./schema";

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isLocal =
  process.env.NODE_ENV === "development" ||
  connectionString.includes("localhost") ||
  connectionString.includes("db.localtest.me");

// Configuring Neon for local development via Neon Proxy
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
 * For the control plane, we use Neon HTTP in production/cloud environments
 * to minimize cold starts and avoid WebSocket overhead.
 */
const useNeonHttp =
  connectionString.includes("neon.tech") || process.env.NODE_ENV === "production";

export const db = useNeonHttp
  ? drizzleHttp(neon(connectionString), { schema })
  : drizzlePg(postgres(connectionString), { schema });
