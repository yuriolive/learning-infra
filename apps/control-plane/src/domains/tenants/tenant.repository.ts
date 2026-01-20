import { and, eq, ne } from "drizzle-orm";

import { database, type Database } from "../../database/database";
import { tenants } from "../../database/schema";

import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

type DatabaseTenant = typeof tenants.$inferSelect;

function mapToTenant(databaseTenant: DatabaseTenant): Tenant {
  return {
    id: databaseTenant.id,
    name: databaseTenant.name,
    domain: databaseTenant.domain ?? undefined,
    status: databaseTenant.status,
    createdAt: databaseTenant.createdAt,
    updatedAt: databaseTenant.updatedAt,
    deletedAt: databaseTenant.deletedAt ?? undefined,
    metadata: databaseTenant.metadata ?? undefined,
  };
}

export class TenantRepository {
  private db: Database;

  constructor(database_?: Database) {
    this.db = database_ ?? (database as Database);
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const [tenant] = await this.db
      .insert(tenants)
      .values({
        name: input.name,
        domain: input.domain,
        metadata: input.metadata,
      })
      .returning();

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    return mapToTenant(tenant);
  }

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")));

    return tenant ? mapToTenant(tenant) : null;
  }

  async findAll(): Promise<Tenant[]> {
    const results = await this.db
      .select()
      .from(tenants)
      .where(ne(tenants.status, "deleted"));

    return results.map((result) => mapToTenant(result));
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const [updated] = await this.db
      .update(tenants)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.domain !== undefined && { domain: input.domain }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")))
      .returning();

    return updated ? mapToTenant(updated) : null;
  }

  async softDelete(id: string): Promise<boolean> {
    const [deleted] = await this.db
      .update(tenants)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")))
      .returning();

    return !!deleted;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.domain, domain), ne(tenants.status, "deleted")));

    return tenant ? mapToTenant(tenant) : null;
  }
}
