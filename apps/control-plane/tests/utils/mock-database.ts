import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "../../src/database/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createMockDatabase() {
  const client = new PGlite();
  const database = drizzle(client, { schema });

  // Initialize schema
  const migrationsFolder = path.resolve(__dirname, "../../drizzle");
  await migrate(database, { migrationsFolder });

  return database;
}
