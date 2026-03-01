import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const DEMO_STORE_FILE = path.resolve(process.cwd(), ".staging/demo-store.json");

async function main() {
  const isReset = process.argv.includes("--reset");

  let tenantData: { id: string; databaseUrl?: string };
  try {
    const fileContent = await fs.readFile(DEMO_STORE_FILE, "utf-8");
    tenantData = JSON.parse(fileContent);
  } catch (err) {
    console.error(
      `Could not read demo store configuration from ${DEMO_STORE_FILE}. Did you run staging:demo:provision first?`,
    );
    process.exit(1);
  }

  const { id, databaseUrl } = tenantData;
  if (!databaseUrl) {
    console.error("No databaseUrl found. We need it to run medusa seed.");
    process.exit(1);
  }

  console.log(`Seeding database for demo store (Tenant ID: ${id})...`);

  if (isReset) {
    console.log(
      "Reset flag provided. Skipping actual reset since wiping the db could break current state if not carefully done.",
    );
  }

  try {
    console.log("Running default seed (store, region, etc.)...");
    execSync("pnpm --filter @vendin/tenant-instance db:seed", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    console.log("Running demo products seed...");
    // Run the script. Note: the medusa CLI needs to be invoked.
    execSync(
      "pnpm --filter @vendin/tenant-instance exec medusa exec ./src/scripts/seed-demo-products.ts",
      { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } },
    );

    console.log("Demo store seeded successfully.");
  } catch (error) {
    console.error("Failed to seed demo store:", error);
    process.exit(1);
  }
}

main().catch(console.error);
