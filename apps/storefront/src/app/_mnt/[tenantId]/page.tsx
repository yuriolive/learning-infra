import { headers } from "next/headers";
import { resolveTenant } from "../../../lib/tenant-resolution";
import { 
  HeroSection, 
  SectionHeader, 
  ProductGrid, 
  CategoryGrid 
} from "../../../components";
import { notFound } from "next/navigation";

export default async function TenantHomePage(properties: {
  params: Promise<{ tenantId: string }>;
}) {
  await properties.params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  const tenant = await resolveTenant(host);

  if (!tenant) {
    notFound();
  }

  // Mock data for the storefront
  const mockCategories = [
    { id: "1", name: "Electronics", slug: "electronics" },
    { id: "2", name: "Fashion", slug: "fashion" },
    { id: "3", name: "Home & Garden", slug: "home-garden" },
    { id: "4", name: "Accessories", slug: "accessories" },
  ];

  const mockProducts = [
    { id: "p1", title: "Premium Headphones", price: 199.99, originalPrice: 249.99, badge: "New" },
    { id: "p2", title: "Smart Watch", price: 299.00, badge: "Popular" },
    { id: "p3", title: "Wireless Speaker", price: 79.50 },
    { id: "p4", title: "Leather Wallet", price: 45.00, originalPrice: 59.00 },
  ];

  return (
    <div className="flex flex-col gap-20 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <HeroSection 
        title={`Welcome to ${tenant.name}`}
        subtitle="Experience our curated collection of high-quality products. Built for speed, security, and scalability."
        primaryColor={tenant.theme.primaryColor}
      />

      {/* Featured Categories */}
      <section>
        <SectionHeader 
          title="Featured Categories" 
          subtitle="Find exactly what you're looking for"
          primaryColor={tenant.theme.primaryColor}
        />
        <CategoryGrid 
          categories={mockCategories} 
          primaryColor={tenant.theme.primaryColor} 
        />
      </section>

      {/* New Arrivals */}
      <section>
        <SectionHeader 
          title="New Arrivals" 
          subtitle="Our latest and greatest additions"
          viewAllHref="/products"
          primaryColor={tenant.theme.primaryColor}
        />
        <ProductGrid 
          products={mockProducts} 
          primaryColor={tenant.theme.primaryColor} 
        />
      </section>
      
      {/* Debug Info */}
      <section className="mt-12 p-6 bg-default-50 rounded-xl border border-default-200">
        <h3 className="text-sm font-mono uppercase tracking-widest text-default-400 mb-4">Storefront Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <p><span className="text-default-500">Tenant ID:</span> {tenant.id}</p>
            <p><span className="text-default-500">Hostname:</span> {host}</p>
          </div>
          <div className="space-y-1">
            <p><span className="text-default-500">Backend URL:</span> {tenant.backendUrl}</p>
            <p><span className="text-default-500">Primary Color:</span> {tenant.theme.primaryColor}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
