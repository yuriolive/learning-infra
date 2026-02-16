/* eslint-disable no-console */

import { localServices } from "@vendin/dev-config";
import "dotenv/config";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { createDatabase } from "./database";
import { tenantProvisioningEvents, tenants } from "./schema";

// Determine DATABASE_URL from process.env or use shared default
const databaseUrl =
  process.env.DATABASE_URL || localServices.database.postgresUrl;

const database = createDatabase(databaseUrl, "development");

async function seed() {
  console.log("Seeding Control Plane database...");

  // Check if tenant already exists
  const existingTenants = await database
    .select()
    .from(tenants)
    .where(eq(tenants.subdomain, "test-store"))
    .limit(1);

  let tenantId: string;

  if (existingTenants.length > 0 && existingTenants[0]) {
    console.log('Test tenant "test-store" already exists. Skipping creation.');
    tenantId = existingTenants[0].id;
  } else {
    // Create test tenant
    const [tenant] = await database
      .insert(tenants)
      .values({
        name: "Test Store",
        merchantEmail: "merchant@test.local",
        subdomain: "test-store",
        status: "active",
        plan: "professional",
        databaseUrl:
          process.env.DATABASE_URL ||
          "postgres://postgres:postgres@localhost:5432/tenant_test_store",
        apiUrl: process.env.API_URL || "http://localhost:9000",
        jwtSecret: nanoid(32),
        cookieSecret: nanoid(32),
        metadata: {
          theme: {
            primaryColor: "#7c3aed",
            fontFamily: "Inter",
            logoUrl: "",
          },
        },
      })
      .returning();

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    console.log("Created test tenant:", tenant.id);
    tenantId = tenant.id;
  }

  // Create provisioning events (idempotent-ish: just add more if run again, or we could check)
  // For simplicity, we'll check if any events exist for this tenant
  const existingEvents = await database
    .select()
    .from(tenantProvisioningEvents)
    .where(eq(tenantProvisioningEvents.tenantId, tenantId))
    .limit(1);

  if (existingEvents.length === 0) {
    await database.insert(tenantProvisioningEvents).values([
      {
        tenantId,
        step: "database_creation",
        status: "completed",
        details: { databaseName: "tenant_test_store" },
      },
      {
        tenantId,
        step: "compute_provisioning",
        status: "completed",
        details: { serviceUrl: process.env.API_URL || "http://localhost:9000" },
      },
    ]);
    console.log("Created provisioning events.");
  } else {
    console.log("Provisioning events already exist. Skipping.");
  }

  console.log("Seeding complete!");
  // Let Node exit naturally
}

await seed();
