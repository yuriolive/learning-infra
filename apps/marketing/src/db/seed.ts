import fs from "node:fs";
import path from "node:path";

// @ts-expect-error - better-sqlite3 is a devDependency and types might be missing in production build context
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { nanoid } from "nanoid";

import * as schema from "./schema.js";

// Define the path to the local D1 database file
// This path matches the one created by 'wrangler d1 migrations apply --local'
// It might vary based on wrangler version, but this is the standard location for v3
const DB_PATH = process.env.LOCAL_D1_PATH
  ? path.resolve(process.env.LOCAL_D1_PATH)
  : path.resolve(
      process.cwd(),
      ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/marketing-db.sqlite",
    );

// Ensure the directory exists
const databaseDirectory = path.dirname(DB_PATH);
if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

const sqlite = new Database(DB_PATH);
const database = drizzle(sqlite, { schema });

async function seed() {
  // eslint-disable-next-line no-console
  console.log("Seeding Marketing database...");

  const userId = nanoid();
  const now = new Date();

  // Check if user already exists (by email for example, or we just create a new one every time but careful with unique constraints)
  // schema.user.email is unique
  const existingUser = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, "test@test.local"))
    .limit(1);

  let targetUserId = userId;

  if (existingUser.length > 0) {
    // eslint-disable-next-line no-console
    console.log("Test user already exists. Skipping creation.");
    targetUserId = existingUser[0].id;
  } else {
    // Create test user
    await database.insert(schema.user).values({
      id: userId,
      name: "Test User",
      email: "test@test.local",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
      phoneNumber: null,
      phoneNumberVerified: null,
    });
    // eslint-disable-next-line no-console
    console.log("Created test user.");
  }

  // Create session
  // Check if session token exists
  const existingSession = await database
    .select()
    .from(schema.session)
    .where(eq(schema.session.token, "test-session-token"))
    .limit(1);

  if (existingSession.length === 0) {
    await database.insert(schema.session).values({
      id: nanoid(),
      userId: targetUserId,
      token: "test-session-token",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: now,
      updatedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
    });
    // eslint-disable-next-line no-console
    console.log("Created test session.");
  } else {
    // eslint-disable-next-line no-console
    console.log("Test session already exists. Skipping.");
  }

  // eslint-disable-next-line no-console
  console.log("Seeding complete!");
}

await seed();
