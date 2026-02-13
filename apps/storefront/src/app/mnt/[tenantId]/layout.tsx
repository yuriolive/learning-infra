import { resolveHost } from "@vendin/utils";
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
  const host = resolveHost(headersList);

  // In a real scenario, the middleware already resolved the tenant.
  // We can re-resolve here to get the full tenant object including theme.
  const tenant = await resolveTenant(host);

  const isDevelopment = process.env.NODE_ENV === "development";

  if (!tenant || (!isDevelopment && tenant.id !== tenantId)) {
    notFound();
  }

  interface CustomCSSProperties extends React.CSSProperties {
    [key: string]: string | number | undefined;
  }

  return (
    <div
      className="tenant-layout min-h-screen flex flex-col"
      style={
        {
          // Apply primary color as a CSS variable for components to use
          "--primary-color": tenant.theme.primaryColor,
          "--heroui-primary": tenant.theme.primaryColor,
          "--heroui-primary-50": `${tenant.theme.primaryColor}10`,
          "--heroui-primary-100": `${tenant.theme.primaryColor}20`,
          "--heroui-primary-200": `${tenant.theme.primaryColor}40`,
          "--heroui-primary-300": `${tenant.theme.primaryColor}60`,
          "--heroui-primary-400": `${tenant.theme.primaryColor}80`,
          "--heroui-primary-500": tenant.theme.primaryColor,
          "--heroui-primary-600": tenant.theme.primaryColor,
          "--heroui-primary-700": tenant.theme.primaryColor,
          "--heroui-primary-800": tenant.theme.primaryColor,
          "--heroui-primary-900": tenant.theme.primaryColor,
          "--heroui-primary-foreground": "#ffffff",
          "--heroui-focus": tenant.theme.primaryColor,
        } as CustomCSSProperties
      }
    >
      <StorefrontNavbar tenant={tenant} />
      <main className="flex-grow">{children}</main>
      <StorefrontFooter tenant={tenant} />
    </div>
  );
}
