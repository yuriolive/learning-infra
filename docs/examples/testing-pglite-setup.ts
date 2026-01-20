// PGLite Setup Pattern for Repository Tests
import { createMockDatabase } from "../../tests/utils/mock-database";

describe("TenantRepository", () => {
  let repository: TenantRepository;

  beforeEach(async () => {
    const db = await createMockDatabase(); // Fresh isolated instance
    repository = new TenantRepository(db);
  });

  it("should create tenant", async () => {
    const tenant = await repository.create({ name: "Store 1" });
    expect(tenant.id).toBeDefined();
  });
});
