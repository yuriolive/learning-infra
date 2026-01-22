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

// Configure connection with timeouts to prevent hanging
const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Fail fast if connection takes > 10 seconds
});
const database = drizzle(sql);

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

let exitCode = 0;

try {
  await migrate(database, { migrationsFolder });
  logger.info("Migrations completed successfully");
} catch (error) {
  logger.error({ error }, "Migration failed");
  exitCode = 1;
} finally {
  // Always close the connection, even if migration throws
  try {
    await sql.end();
  } catch (endError) {
    logger.error({ error: endError }, "Failed to close database connection");
    exitCode = 1;
  }
}

// Explicitly exit to ensure process terminates
// eslint-disable-next-line unicorn/no-process-exit -- This is a CLI migration script
process.exit(exitCode);
