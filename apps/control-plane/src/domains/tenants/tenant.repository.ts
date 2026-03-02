import { createHash, randomBytes, randomUUID } from "node:crypto";

import { mapOptional } from "@vendin/utils";
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
    ...databaseTenant,
    subdomain: mapOptional(databaseTenant.subdomain),
    databaseUrl: mapOptional(databaseTenant.databaseUrl),
    apiUrl: mapOptional(databaseTenant.apiUrl),
    redisHash: mapOptional(databaseTenant.redisHash),
    deletedAt: mapOptional(databaseTenant.deletedAt),
    metadata: mapOptional(databaseTenant.metadata),
    failureReason: mapOptional(databaseTenant.failureReason),
    jwtSecret: databaseTenant.jwtSecret!,
    cookieSecret: databaseTenant.cookieSecret!,
    whatsappPhoneNumber: mapOptional(databaseTenant.whatsappPhoneNumber),
    whatsappPhoneId: mapOptional(databaseTenant.whatsappPhoneId),
    whatsappProvider: mapOptional(databaseTenant.whatsappProvider),
    whatsappVerifiedAt: mapOptional(databaseTenant.whatsappVerifiedAt),
    neonProjectId: mapOptional(databaseTenant.neonProjectId),
    releaseChannelId: mapOptional(databaseTenant.releaseChannelId),
    currentImageTag: mapOptional(databaseTenant.currentImageTag),
    lockedUntil: mapOptional(databaseTenant.lockedUntil),
  };
}

/**
 * Repository class for managing Tenant records in the database.
 */
export class TenantRepository {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Creates a new tenant record in the database, generating a unique ID and secrets.
   *
   * @param input - The data needed to create the tenant.
   * @returns The newly created tenant record.
   */
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
        whatsappPhoneNumber: input.whatsappPhoneNumber
          ? input.whatsappPhoneNumber.replaceAll(/\D/g, "")
          : null,
        whatsappPhoneId: input.whatsappPhoneId,
        releaseChannelId: input.releaseChannelId || "stable",
      })
      .returning();

    if (!tenant) {
      throw new Error("Failed to create tenant");
    }

    return mapToTenant(tenant);
  }

  /**
   * Finds a tenant by its unique identifier.
   * Excludes tenants that have been soft-deleted.
   *
   * @param id - The unique identifier of the tenant.
   * @returns The tenant record if found, or null otherwise.
   */
  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")));

    return tenant ? mapToTenant(tenant) : null;
  }

  /**
   * Retrieves all non-deleted tenant records from the database.
   *
   * @returns An array of tenant records.
   */
  async findAll(): Promise<Tenant[]> {
    const results = await this.db
      .select()
      .from(tenants)
      .where(ne(tenants.status, "deleted"));

    return results.map((result) => mapToTenant(result));
  }

  /**
   * Updates an existing tenant record with the provided input.
   * Excludes tenants that have been soft-deleted.
   *
   * @param id - The unique identifier of the tenant to update.
   * @param input - The data to update on the tenant.
   * @returns The updated tenant record, or null if the tenant was not found.
   */
  async update(id: string, input: UpdateTenantInput): Promise<Tenant | null> {
    const updateData = this.prepareUpdateData(input);

    const [updated] = await this.db
      .update(tenants)
      .set(updateData)
      .where(and(eq(tenants.id, id), ne(tenants.status, "deleted")))
      .returning();

    return updated ? mapToTenant(updated) : null;
  }

  /**
   * Prepares the update payload for the database.
   * Strips undefined values to satisfy exactOptionalPropertyTypes and
   * formats the WhatsApp phone number by removing non-numeric characters.
   *
   * @param input - Data to update the tenant with
   * @returns Cleaned partial database tenant payload
   */
  private prepareUpdateData(input: UpdateTenantInput): Partial<DatabaseTenant> {
    const updateData: Partial<DatabaseTenant> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        if (key === "whatsappPhoneNumber") {
          updateData.whatsappPhoneNumber =
            (value as string | null)?.replaceAll(/\D/g, "") ?? null;
        } else {
          Object.assign(updateData, { [key]: value });
        }
      }
    }

    return updateData;
  }

  /**
   * Soft deletes a tenant record by setting its `deletedAt` timestamp.
   *
   * @param id - The unique identifier of the tenant to soft delete.
   * @returns True if the tenant was successfully soft deleted, false otherwise.
   */
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

  /**
   * Finds a tenant by its associated subdomain.
   * Excludes tenants that have been soft-deleted.
   *
   * @param subdomain - The subdomain associated with the tenant.
   * @returns The tenant record if found, or null otherwise.
   */
  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(
        and(eq(tenants.subdomain, subdomain), ne(tenants.status, "deleted")),
      );

    return tenant ? mapToTenant(tenant) : null;
  }

  /**
   * Finds a tenant by its associated WhatsApp Phone ID.
   * Excludes tenants that have been soft-deleted.
   *
   * @param phoneId - The WhatsApp Phone ID associated with the tenant.
   * @returns The tenant record if found, or null otherwise.
   */
  async findByWhatsAppPhoneId(phoneId: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.whatsappPhoneId, phoneId),
          ne(tenants.status, "deleted"),
        ),
      );

    return tenant ? mapToTenant(tenant) : null;
  }

  /**
   * Finds a tenant by its associated WhatsApp Phone Number.
   * Evaluates exact digits only since phone numbers are stored without formatting.
   * Excludes tenants that have been soft-deleted.
   *
   * @param phoneNumber - The WhatsApp Phone Number associated with the tenant.
   * @returns The tenant record if found, or null otherwise.
   */
  async findByWhatsAppNumber(phoneNumber: string): Promise<Tenant | null> {
    const digitsOnly = phoneNumber.replaceAll(/\D/g, "");

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.whatsappPhoneNumber, digitsOnly),
          ne(tenants.status, "deleted"),
        ),
      );

    return tenant ? mapToTenant(tenant) : null;
  }

  /**
   * Logs an event that occurred during the tenant provisioning process.
   *
   * @param tenantId - The tenant's unique identifier
   * @param step - The step in the provisioning lifecycle
   * @param status - The status of the provisioning step
   * @param details - Optional JSON payload with additional details
   */
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
