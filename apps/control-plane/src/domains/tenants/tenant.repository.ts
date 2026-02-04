import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";

import { type Database } from "../../database/database";
import { tenants, tenantProvisioningEvents } from "../../database/schema";

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
    merchantEmail: databaseTenant.merchantEmail,
    subdomain: databaseTenant.subdomain ?? null,
    databaseUrl: databaseTenant.databaseUrl ?? null,
    apiUrl: databaseTenant.apiUrl ?? null,
    redisHash: databaseTenant.redisHash ?? null,
    status: databaseTenant.status,
    plan: databaseTenant.plan,
    createdAt: databaseTenant.createdAt,
    updatedAt: databaseTenant.updatedAt,
    deletedAt: databaseTenant.deletedAt ?? null,
    metadata: databaseTenant.metadata ?? null,
    failureReason: databaseTenant.failureReason ?? null,
    jwtSecret: databaseTenant.jwtSecret!,
    cookieSecret: databaseTenant.cookieSecret!,
  };
}

export class TenantRepository {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const id = randomUUID();
    const redisHash = createHash("sha256")
      .update(id)
      .digest("hex")
      .slice(0, 12);

    const [tenant] = await this.db
      .insert(tenants)
      .values({
        id,
        name: input.name,
        merchantEmail: input.merchantEmail,
        subdomain: input.subdomain,
        plan: input.plan,
        metadata: input.metadata,
        redisHash,
        jwtSecret: randomBytes(32).toString("hex"),
        cookieSecret: randomBytes(32).toString("hex"),
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
        ...(input.subdomain !== undefined && { subdomain: input.subdomain }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.plan !== undefined && { plan: input.plan }),
        ...(input.databaseUrl !== undefined && {
          databaseUrl: input.databaseUrl,
        }),
        ...(input.apiUrl !== undefined && { apiUrl: input.apiUrl }),
        ...(input.redisHash !== undefined && { redisHash: input.redisHash }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.failureReason !== undefined && {
          failureReason: input.failureReason,
        }),
        ...(input.jwtSecret !== undefined && { jwtSecret: input.jwtSecret }),
        ...(input.cookieSecret !== undefined && {
          cookieSecret: input.cookieSecret,
        }),
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

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(
        and(eq(tenants.subdomain, subdomain), ne(tenants.status, "deleted")),
      );

    return tenant ? mapToTenant(tenant) : null;
  }

  async logProvisioningEvent(
    tenantId: string,
    step: string,
    status: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(tenantProvisioningEvents).values({
      tenantId,
      step,
      status,
      details,
    });
  }
}
