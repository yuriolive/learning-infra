import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { StorefrontFooter } from "../../../components/layout/footer";
import { StorefrontNavbar } from "../../../components/layout/navbar";
import { resolveTenant } from "../../../lib/tenant-resolution";

import type { ReactNode } from "react";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // In a real scenario, the middleware already resolved the tenant.
  // We can re-resolve here to get the full tenant object including theme.
  const tenant = await resolveTenant(host);

  const isDevelopment = process.env.NODE_ENV === "development";

  if (!tenant || (!isDevelopment && tenant.id !== tenantId)) {
    notFound();
  }

  return (
    <div
      className="tenant-layout min-h-screen flex flex-col"
      style={{
        // Apply primary color as a CSS variable for components to use
        "--primary-color": tenant.theme.primaryColor,
        "--heroui-primary": tenant.theme.primaryColor,
        "--heroui-primary-500": tenant.theme.primaryColor,
      }}
    >
      <StorefrontNavbar tenant={tenant} />
      <main className="flex-grow">{children}</main>
      <StorefrontFooter tenant={tenant} />
    </div>
  );
}
