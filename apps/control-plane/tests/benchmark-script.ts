import { TenantRepository } from "../src/domains/tenants/tenant.repository";

import { createMockDatabase } from "./utils/mock-database";

import type { CreateTenantInput } from "../src/domains/tenants/tenant.types";

async function runBenchmark() {
  console.log("Setting up benchmark...");
  const database = await createMockDatabase();
  const repository = new TenantRepository(database);

  // Seed 1000 tenants
  console.log("Seeding 1000 tenants...");
  const tenants: CreateTenantInput[] = [];
  for (let index = 0; index < 1000; index++) {
    tenants.push({
      name: `Benchmark Tenant ${index}`,
      merchantEmail: `benchmark${index}@example.com`,
      subdomain: `bench${index}`,
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

  for (let index = 0; index < iterations; index++) {
    const start = performance.now();
    const results = await repository.findAll();
    const end = performance.now();
    totalTime += end - start;
    recordCount = results.length;
  }

  const avgTime = totalTime / iterations;
  console.log(
    `Average time to fetch ${recordCount} records (page 1): ${avgTime.toFixed(2)}ms`,
  );

  // Benchmark "Fetch All via Pagination" vs "Fetch All Unbounded"
  // Note: We can't run unbounded on the modified repo easily without changing code back or passing a huge limit.
  // We can pass a huge limit to simulate unbounded.

  console.log("Running unbounded simulation (limit=2000)...");
  let totalTimeUnbounded = 0;
  for (let index = 0; index < iterations; index++) {
    const start = performance.now();
    await repository.findAll(2000);
    const end = performance.now();
    totalTimeUnbounded += end - start;
  }
  const avgTimeUnbounded = totalTimeUnbounded / iterations;
  console.log(
    `Average time to fetch 1000 records (simulated unbounded): ${avgTimeUnbounded.toFixed(2)}ms`,
  );

  // Benchmark sequential pagination
  console.log("Running sequential pagination (fetch all 1000 records)...");
  let totalTimePagination = 0;
  for (let index = 0; index < 5; index++) {
    // fewer iterations as it takes longer
    const start = performance.now();
    let fetched = 0;
    let offset = 0;
    while (fetched < 1000) {
      const page = await repository.findAll(20, offset);
      fetched += page.length;
      offset += 20;
      if (page.length === 0) break;
    }
    const end = performance.now();
    totalTimePagination += end - start;
  }
  const avgTimePagination = totalTimePagination / 5;
  console.log(
    `Average time to fetch 1000 records via pagination (page size 20): ${avgTimePagination.toFixed(2)}ms`,
  );
}

await runBenchmark().catch(console.error);
