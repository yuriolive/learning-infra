import path from "node:path";

import { createLogger } from "@vendin/utils/logger";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const logger = createLogger({
  logLevel: process.env.LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV ?? "development",
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

logger.info("Running migrations...");

const sql = postgres(connectionString, { max: 1 });
const database = drizzle(sql);

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

try {
  await migrate(database, { migrationsFolder });
  logger.info("Migrations completed successfully");
  await sql.end();
} catch (error) {
  logger.error({ error }, "Migration failed");
  await sql.end();
  throw error;
}
