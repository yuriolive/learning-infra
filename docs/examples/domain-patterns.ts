// Domain-Driven Design Patterns

// Repository Pattern
export class TenantRepository {
  async create(data: CreateTenantInput): Promise<Tenant> {
    // Database operations
  }
  
  async findById(id: string): Promise<Tenant | null> {
    // Database query
  }
  
  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    // Database query
  }
}

// Service Pattern
export class TenantService {
  constructor(
    private repository: TenantRepository,
    private neonApi: NeonApi,
    private cloudRunApi: CloudRunApi,
    private cloudflareApi: CloudflareApi
  ) {}
  
  async provisionTenant(input: CreateTenantInput): Promise<Tenant> {
    // Orchestrate provisioning workflow
  }
}

// Route Pattern
export const tenantRoutes = {
  'POST /api/tenants': async (req, res) => {
    const tenant = await tenantService.provisionTenant(req.body);
    return res.json(tenant);
  }
};

// Dependency Injection Pattern for Testing
export class TenantRepository {
  private db: typeof database;

  constructor(db?: typeof database) {
    this.db = db ?? database; // Use injected for tests, global for production
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const [tenant] = await this.db
      .insert(tenants)
      .values(input)
      .returning();
    return tenant;
  }
}
