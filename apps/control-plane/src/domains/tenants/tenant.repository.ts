import { and, eq, ne } from "drizzle-orm";

import { database } from "../../database/database";
import { tenants } from "../../database/schema";

import type {
  CreateTenantInput,
  Tenant,
  UpdateTenantInput,
} from "./tenant.types";

export class TenantRepository {
  async create(input: CreateTenantInput): Promise<Tenant> {
    const [tenant] = await database
      .insert(tenants)
      .values({
        name: input.name,
        domain: input.domain,
        metadata: input.metadata,
      })
      .returning();

    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await database
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")));

    return tenant || null;
  }

  async findAll(): Promise<Tenant[]> {
    return database.select().from(tenants).where(ne(tenants.status, "deleted"));
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const [updated] = await database
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

    return updated || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const [deleted] = await database
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
    const [tenant] = await database
      .select()
      .from(tenants)
      .where(and(eq(tenants.domain, domain), ne(tenants.status, "deleted")));

    return tenant || null;
  }
}
