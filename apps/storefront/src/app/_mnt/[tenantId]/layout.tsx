import { ReactNode } from "react";
import { headers } from "next/headers";
import { resolveTenant } from "../../../lib/tenant-resolution";
import { StorefrontNavbar } from "../../../components/layout/navbar";
import { StorefrontFooter } from "../../../components/layout/footer";
import { notFound } from "next/navigation";

export default async function TenantLayout({ 
  children,
  params 
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

  if (!tenant || tenant.id !== tenantId) {
    notFound();
  }

  return (
    <div className="tenant-layout min-h-screen flex flex-col bg-white" style={{ 
      // Apply primary color as a CSS variable for components to use if needed
      // @ts-expect-error - CSS variable for primary color
      "--primary-color": tenant.theme.primaryColor 
    }}>
      <StorefrontNavbar tenant={tenant} />
      <main className="flex-grow">
        {children}
      </main>
      <StorefrontFooter tenant={tenant} />
    </div>
  );
}
