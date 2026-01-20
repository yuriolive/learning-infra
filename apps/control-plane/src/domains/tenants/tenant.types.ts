export interface Tenant {
  id: string;
  name: string;
  merchantEmail: string;
  domain: string | null;
  databaseUrl: string | null;
  apiUrl: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  metadata: Record<string, unknown> | null;
}

export type TenantStatus = "provisioning" | "active" | "suspended" | "deleted";

export type TenantPlan = "free" | "starter" | "professional" | "enterprise";

export interface CreateTenantInput {
  name: string;
  merchantEmail: string;
  domain?: string | undefined;
  plan?: TenantPlan | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateTenantInput {
  name?: string | undefined;
  domain?: string | undefined;
  status?: TenantStatus | undefined;
  plan?: TenantPlan | undefined;
  databaseUrl?: string | undefined;
  apiUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}
