export type TenantStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "deleted"
  | "provisioning_failed";

export type TenantPlan = "free" | "starter" | "professional" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  merchantEmail: string;
  subdomain: string | null;
  databaseUrl: string | null;
  apiUrl: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: string; // Serialized as string in JSON
  updatedAt: string;
  deletedAt: string | null;
  metadata: Record<string, unknown> | null;
}
