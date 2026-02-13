import {
  generateHeroUIPalette,
  getContrastColor,
  resolveHost,
} from "@vendin/utils";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { StorefrontFooter } from "../../../components/layout/footer";
import { StorefrontNavbar } from "../../../components/layout/navbar";
import { resolveTenant } from "../../../lib/tenant-resolution";

import type { ReactNode } from "react";

interface CustomCSSProperties extends React.CSSProperties {
  [key: string]: string | number | undefined;
}

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

  const palette = generateHeroUIPalette(tenant.theme.primaryColor);
  const foregroundColor = getContrastColor(tenant.theme.primaryColor);

  return (
    <div
      className="tenant-layout min-h-screen flex flex-col"
      style={
        {
          // Apply primary color as a CSS variable for components to use
          "--primary-color": tenant.theme.primaryColor,
          "--heroui-primary": tenant.theme.primaryColor,
          "--heroui-primary-50": palette[50],
          "--heroui-primary-100": palette[100],
          "--heroui-primary-200": palette[200],
          "--heroui-primary-300": palette[300],
          "--heroui-primary-400": palette[400],
          "--heroui-primary-500": palette[500],
          "--heroui-primary-600": palette[600],
          "--heroui-primary-700": palette[700],
          "--heroui-primary-800": palette[800],
          "--heroui-primary-900": palette[900],
          "--heroui-primary-foreground": foregroundColor,
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
