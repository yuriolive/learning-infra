// Neon Database Provisioning Pattern
// Create new Neon database for tenant
const database = await neonApi.createDatabase({
  projectId: NEON_PROJECT_ID,
  branch: {
    name: `tenant-${tenantId}`
  }
});

// Store connection string in Secret Manager
await secretManager.createSecret({
  name: `tenant-${tenantId}-db-url`,
  value: database.connectionString
});

// Connection Pattern in tenant instance
const databaseUrl = process.env.DATABASE_URL; // From Secret Manager
const db = drizzle(neon(databaseUrl), { schema });

// Cleanup Pattern
// Delete database via Neon API
await neonApi.deleteDatabase({
  projectId: NEON_PROJECT_ID,
  branchId: tenantDatabase.branchId
});

// Delete secret
await secretManager.deleteSecret(`tenant-${tenantId}-db-url`);
