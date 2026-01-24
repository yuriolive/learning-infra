import { PGlite } from "@electric-sql/pglite";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";

import * as schema from "./schema";

export type Database =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

const getConnectionString = (rawConnectionString: unknown): string => {
  return typeof rawConnectionString === "string"
    ? rawConnectionString
    : rawConnectionString &&
        typeof rawConnectionString === "object" &&
        "connectionString" in rawConnectionString &&
        typeof rawConnectionString.connectionString === "string"
      ? rawConnectionString.connectionString
      : "";
};

const configureNeonForLocal = (connectionString: string) => {
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
};

const createPgliteDatabase = (connectionString: string): Database => {
  const client = new PGlite(
    connectionString.startsWith("memory://") ? connectionString : undefined,
  );
  return drizzlePglite(client, { schema });
};

const resolveDriver = (
  connectionString: string,
  nodeEnvironment: string,
): Database => {
  const isLocal =
    nodeEnvironment === "development" ||
    connectionString.includes("localhost") ||
    connectionString.includes("db.localtest.me");

  if (isLocal && connectionString.includes("db.localtest.me")) {
    configureNeonForLocal(connectionString);
  }

  if (nodeEnvironment !== "production") {
    neonConfig.webSocketConstructor = ws;
  }

  const useNeonHttp =
    connectionString.includes("neon.tech") || nodeEnvironment === "production";

  return useNeonHttp
    ? drizzleHttp(neon(connectionString), { schema })
    : drizzlePg(postgres(connectionString), { schema });
};

export const createDatabase = (
  rawConnectionString: unknown,
  nodeEnvironment: string = "production",
): Database => {
  const connectionString = getConnectionString(rawConnectionString);

  // Use PGLite for memory/test environments if requested
  if (
    connectionString.startsWith("memory://") ||
    (nodeEnvironment === "test" && !connectionString)
  ) {
    return createPgliteDatabase(connectionString);
  }

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not defined or is an invalid type. " +
        "Ensure it is set as an environment variable (string) or a Hyperdrive binding.",
    );
  }

  return resolveDriver(connectionString, nodeEnvironment);
};
