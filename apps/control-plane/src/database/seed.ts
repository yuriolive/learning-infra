import 'dotenv/config';
import { createDatabase } from './database';
import { tenants, tenantProvisioningEvents } from './schema';
import { nanoid } from 'nanoid';

// Determine DATABASE_URL from process.env or default
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/main';

const db = createDatabase(databaseUrl, 'development');

async function seed() {
  console.log('Seeding Control Plane database...');

  // Create test tenant
  const [tenant] = await db.insert(tenants).values({
    name: 'Test Store',
    merchantEmail: 'merchant@test.local',
    subdomain: 'test-store',
    status: 'active',
    plan: 'professional',
    databaseUrl: 'postgres://postgres:postgres@localhost:5432/tenant_test_store',
    apiUrl: 'http://localhost:9000',
    jwtSecret: nanoid(32),
    cookieSecret: nanoid(32),
    metadata: {
      theme: {
        primaryColor: '#7c3aed',
        fontFamily: 'Inter',
        logoUrl: '',
      },
    },
  }).returning();

  if (!tenant) {
    throw new Error('Failed to create tenant');
  }

  console.log('Created test tenant:', tenant.id);

  // Create provisioning events
  await db.insert(tenantProvisioningEvents).values([
    {
      tenantId: tenant.id,
      step: 'database_creation',
      status: 'completed',
      details: { databaseName: 'tenant_test_store' },
    },
    {
      tenantId: tenant.id,
      step: 'compute_provisioning',
      status: 'completed',
      details: { serviceUrl: 'http://localhost:9000' },
    },
  ]);

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
