import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TenantRepository } from "../../src/domains/tenants/tenant.repository";
import { TenantService } from "../../src/domains/tenants/tenant.service";
import { TestEnvironment } from "../utils/test-containers";
import { Database } from "../../src/database/database";

describe("Hostname Resolution Integration", () => {
  let testEnv: TestEnvironment;
  let db: Database;
  let repository: TenantRepository;
  let service: TenantService;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    const pg = await testEnv.startPostgres();
    db = pg.db;

    repository = new TenantRepository(db);

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const mockProvisioningService = {} as any;

    service = new TenantService(repository, mockProvisioningService, {
      logger: mockLogger as any,
      gcpProjectId: "test-project",
      gcpRegion: "us-central1",
      tenantBaseDomain: ".vendin.store",
    });
  }, 60000); // 60s timeout for pulling postgres image

  afterAll(async () => {
    await testEnv.stop();
  });

  it("should resolve a tenant by exact subdomain", async () => {
    await repository.create({
      name: "Test Store Exact",
      merchantEmail: "exact@example.com",
      subdomain: "exactstore",
      metadata: {},
    });

    const tenants = await service.listTenants({ subdomain: "exactstore" });
    expect(tenants.length).toBe(1);
    expect(tenants[0]?.subdomain).toBe("exactstore");
  });

  it("should strip the tenantBaseDomain when resolving a storefront hostname", async () => {
    await repository.create({
      name: "Test Store Appended",
      merchantEmail: "appended@example.com",
      subdomain: "my-cool-store",
      metadata: {},
    });

    // When the storefront asks the control plane to resolve "my-cool-store.vendin.store",
    // the listTenants filter is expected to strip ".vendin.store" and lookup "my-cool-store"
    const tenants = await service.listTenants({ subdomain: "my-cool-store.vendin.store" });

    expect(tenants.length).toBe(1);
    expect(tenants[0]?.subdomain).toBe("my-cool-store");
  });

  it("should not strip base domain from unrelated domains", async () => {
    await repository.create({
      name: "Test Store Other",
      merchantEmail: "other@example.com",
      subdomain: "otherstore.com",
      metadata: {},
    });

    const tenants = await service.listTenants({ subdomain: "otherstore.com" });
    expect(tenants.length).toBe(1);
    expect(tenants[0]?.subdomain).toBe("otherstore.com");
  });

  it("should return empty array for non-existent subdomain", async () => {
    const tenants = await service.listTenants({ subdomain: "does-not-exist" });
    expect(tenants.length).toBe(0);
  });
});
