export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type TenantStatus = "active" | "suspended" | "deleted";

export interface CreateTenantInput {
  name: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  domain?: string;
  status?: TenantStatus;
  metadata?: Record<string, unknown>;
}
