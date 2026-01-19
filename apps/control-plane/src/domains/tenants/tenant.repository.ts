import { randomUUID } from "node:crypto";

import type { CreateTenantInput, Tenant, UpdateTenantInput } from "./tenant.types";

export class TenantRepository {
  private tenants: Map<string, Tenant> = new Map();

  async create(input: CreateTenantInput): Promise<Tenant> {
    const now = new Date();
    const tenant: Tenant = {
      id: randomUUID(),
      name: input.name,
      domain: input.domain,
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant || tenant.status === "deleted") {
      return null;
    }
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(tenant => tenant.status !== "deleted");
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant || tenant.status === "deleted") {
      return null;
    }

    const updated: Tenant = {
      ...tenant,
      ...input,
      updatedAt: new Date(),
    };

    this.tenants.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<boolean> {
    const tenant = this.tenants.get(id);
    if (!tenant || tenant.status === "deleted") {
      return false;
    }

    const deleted: Tenant = {
      ...tenant,
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(id, deleted);
    return true;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    for (const tenant of this.tenants.values()) {
      if (tenant.domain === domain && tenant.status !== "deleted") {
        return tenant;
      }
    }
    return null;
  }
}
