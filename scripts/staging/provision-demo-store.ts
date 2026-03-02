import fs from "node:fs/promises";
import path from "node:path";

function getRequiredEnv(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    console.error(`Missing ${varName} environment variable.`);
    process.exit(1);
  }
  return value;
}

const STAGING_CONTROL_PLANE_URL = getRequiredEnv("STAGING_CONTROL_PLANE_URL");
const ADMIN_API_TOKEN = getRequiredEnv("ADMIN_API_TOKEN"); // Required for the API
const STAGING_BASE_DOMAIN = getRequiredEnv("STAGING_BASE_DOMAIN");

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_STORE_FILE = path.resolve(
  __dirname,
  "../../.staging/demo-store.json",
);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Creating demo store at ${STAGING_CONTROL_PLANE_URL}...`);

  // 1. Create the tenant
  const createRes = await fetch(`${STAGING_CONTROL_PLANE_URL}/api/tenants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_API_TOKEN}`,
    },
    body: JSON.stringify({
      name: "Demo Store",
      domain: "demo-store",
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    // If it already exists, that's fine, we will just fetch it
    if (createRes.status === 409) {
      console.log("Demo store already exists. Fetching details...");
    } else {
      console.error(
        `Failed to create tenant: ${createRes.status} ${createRes.statusText}`,
      );
      console.error(errorText);
      process.exit(1);
    }
  }

  // 2. Fetch the demo store tenant by subdomain
  interface Tenant {
    id: string;
    domain: string;
    status: string;
    name: string;
    databaseUrl?: string;
    createdAt?: string;
  }

  const listRes = await fetch(
    `${STAGING_CONTROL_PLANE_URL}/api/tenants?subdomain=demo-store`,
    {
      headers: {
        Authorization: `Bearer ${ADMIN_API_TOKEN}`,
      },
    },
  );

  if (!listRes.ok) {
    console.error("Failed to list tenants.");
    process.exit(1);
  }

  const listData = await listRes.json();
  const demoTenant: Tenant = listData.data[0];

  if (!demoTenant) {
    console.error("Could not find demo-store tenant after creation.");
    process.exit(1);
  }

  console.log(
    `Found demo store with ID: ${demoTenant.id}. Current status: ${demoTenant.status}`,
  );

  // 3. Poll for status active
  let currentStatus = demoTenant.status;
  let tenantData = demoTenant;
  const timeoutMs = 10 * 60 * 1000; // 10 minutes
  const start = Date.now();

  while (currentStatus !== "active" && Date.now() - start < timeoutMs) {
    console.log(`Status is ${currentStatus}. Waiting 10 seconds...`);
    await sleep(10000);

    const getRes = await fetch(
      `${STAGING_CONTROL_PLANE_URL}/api/tenants/${demoTenant.id}`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_API_TOKEN}`,
        },
      },
    );

    if (getRes.ok) {
      const getData = await getRes.json();
      tenantData = getData.data;
      currentStatus = tenantData.status;
    } else {
      console.warn(`Failed to fetch tenant status: ${getRes.status}`);
    }
  }

  if (currentStatus !== "active") {
    console.error(
      `Tenant failed to become active within 10 minutes. Final status: ${currentStatus}`,
    );
    process.exit(1);
  }

  console.log("Tenant is active!");

  // 4. Update release channel to "internal"
  console.log("Setting release channel to 'internal'...");
  const patchRes = await fetch(
    `${STAGING_CONTROL_PLANE_URL}/api/tenants/${demoTenant.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADMIN_API_TOKEN}`,
      },
      body: JSON.stringify({
        releaseChannelId: "internal",
      }),
    },
  );

  if (!patchRes.ok) {
    const errorText = await patchRes.text();
    console.error(
      `Failed to patch release channel: ${patchRes.status} ${patchRes.statusText}`,
    );
    console.error(errorText);
    process.exit(1);
  } else {
    console.log("Successfully set release channel to 'internal'.");
  }

  // 5. Write details to .staging/demo-store.json
  await fs.mkdir(path.dirname(DEMO_STORE_FILE), { recursive: true });

  // Create API and Storefront URLs
  const baseDomain = STAGING_BASE_DOMAIN;
  const apiUrl = `https://api.demo-store.${baseDomain}`;
  const storefrontUrl = `https://demo-store.${baseDomain}`;

  const outputData = {
    id: tenantData.id,
    name: tenantData.name,
    domain: tenantData.domain,
    status: tenantData.status,
    databaseUrl: tenantData.databaseUrl,
    apiUrl,
    storefrontUrl,
    createdAt: tenantData.createdAt,
  };

  await fs.writeFile(DEMO_STORE_FILE, JSON.stringify(outputData, null, 2));
  console.log(`Saved demo store details to ${DEMO_STORE_FILE}`);
}

main().catch(console.error);
