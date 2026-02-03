export interface Tenant {
  id: string;
  name: string;
  merchantEmail: string;
  subdomain: string | null;
  databaseUrl: string | null;
  apiUrl: string | null;
  redisHash: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  metadata: Record<string, unknown> | null;
  failureReason: string | null;
  jwtSecret: string | null;
  cookieSecret: string | null;
}

export type TenantStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "deleted"
  | "provisioning_failed";

export type TenantPlan = "free" | "starter" | "professional" | "enterprise";

export interface CreateTenantInput {
  name: string;
  merchantEmail: string;
  subdomain?: string | undefined;
  plan?: TenantPlan | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateTenantInput {
  name?: string | undefined;
  subdomain?: string | undefined;
  status?: TenantStatus | undefined;
  plan?: TenantPlan | undefined;
  databaseUrl?: string | undefined;
  apiUrl?: string | undefined;
  redisHash?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  failureReason?: string | undefined;
  jwtSecret?: string | undefined;
  cookieSecret?: string | undefined;
}
