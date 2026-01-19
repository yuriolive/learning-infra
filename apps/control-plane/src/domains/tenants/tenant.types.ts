export interface Tenant {
  id: string;
  name: string;
  domain?: string | undefined;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export type TenantStatus = "active" | "suspended" | "deleted";

export interface CreateTenantInput {
  name: string;
  domain?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateTenantInput {
  name?: string | undefined;
  domain?: string | undefined;
  status?: TenantStatus | undefined;
  metadata?: Record<string, unknown> | undefined;
}
