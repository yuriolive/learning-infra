
import { TenantRepository } from "../src/domains/tenants/tenant.repository";
import { createMockDatabase } from "./utils/mock-database";
import { CreateTenantInput } from "../src/domains/tenants/tenant.types";

async function runBenchmark() {
  console.log("Setting up benchmark...");
  const database = await createMockDatabase();
  const repository = new TenantRepository(database);

  // Seed 1000 tenants
  console.log("Seeding 1000 tenants...");
  const tenants: CreateTenantInput[] = [];
  for (let i = 0; i < 1000; i++) {
    tenants.push({
      name: `Benchmark Tenant ${i}`,
      merchantEmail: `benchmark${i}@example.com`,
      subdomain: `bench${i}`,
    });
  }

  // Seed in chunks to be faster? Or just sequentially.
  // Repository create is one by one.
  const startSeed = performance.now();
  for (const t of tenants) {
    await repository.create(t);
  }
  const endSeed = performance.now();
  console.log(`Seeding took ${(endSeed - startSeed).toFixed(2)}ms`);

  console.log("Running benchmark...");

  // Warmup
  await repository.findAll();

  const iterations = 20;
  let totalTime = 0;
  let recordCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const results = await repository.findAll();
    const end = performance.now();
    totalTime += (end - start);
    recordCount = results.length;
  }

  const avgTime = totalTime / iterations;
  console.log(`Average time to fetch ${recordCount} records: ${avgTime.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
