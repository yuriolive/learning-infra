import type { TenantRepository } from "./tenant.repository";
import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

export class TenantService {
  constructor(private repository: TenantRepository) {}

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    if (input.domain) {
      const existing = await this.repository.findByDomain(input.domain);
      if (existing) {
        throw new Error("Domain already in use");
      }
    }

    return this.repository.create(input);
  }

  async getTenant(id: string): Promise<Tenant> {
    const tenant = await this.repository.findById(id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    return tenant;
  }

  async updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    if (input.domain) {
      const existing = await this.repository.findByDomain(input.domain);
      if (existing && existing.id !== id) {
        throw new Error("Domain already in use");
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error("Tenant not found");
    }
    return updated;
  }

  async deleteTenant(id: string): Promise<void> {
    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new Error("Tenant not found");
    }
  }

  async listTenants(): Promise<Tenant[]> {
    const tenants = await this.repository.findAll();
    return tenants;
  }
}
