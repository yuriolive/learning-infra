import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  HeroSection,
  SectionHeader,
  ProductGrid,
  CategoryGrid,
} from "../../../components";
import { resolveTenant } from "../../../lib/tenant-resolution";

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
    {
      id: "1",
      name: "Electronics",
      slug: "electronics",
      image:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=300&h=300&auto=format&fit=crop",
    },
    {
      id: "2",
      name: "Fashion",
      slug: "fashion",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=300&h=300&auto=format&fit=crop",
    },
    {
      id: "3",
      name: "Home & Garden",
      slug: "home-garden",
      image:
        "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?q=80&w=300&h=300&auto=format&fit=crop",
    },
    {
      id: "4",
      name: "Accessories",
      slug: "accessories",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=300&h=300&auto=format&fit=crop",
    },
  ];

  const mockProducts = [
    {
      id: "p1",
      title: "Premium Wireless Headphones",
      price: 199.99,
      originalPrice: 249.99,
      badge: "New",
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500&h=500&auto=format&fit=crop",
    },
    {
      id: "p2",
      title: "Smart Designer Watch",
      price: 299,
      badge: "Popular",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500&h=500&auto=format&fit=crop",
    },
    {
      id: "p3",
      title: "Portable Bluetooth Speaker",
      price: 79.5,
      image:
        "https://images.unsplash.com/photo-1608156639585-34a0a56ee624?q=80&w=500&h=500&auto=format&fit=crop",
    },
    {
      id: "p4",
      title: "Genuine Leather Wallet",
      price: 45,
      originalPrice: 59,
      image:
        "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=500&h=500&auto=format&fit=crop",
    },
  ];

  return (
    <div className="flex flex-col gap-20 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <HeroSection
        title={`Welcome to ${tenant.name}`}
        subtitle="Experience our curated collection of high-quality products. Built for speed, security, and scalability."
      />

      {/* Featured Categories */}
      <section>
        <SectionHeader
          title="Featured Categories"
          subtitle="Find exactly what you're looking for"
        />
        <CategoryGrid categories={mockCategories} />
      </section>

      {/* New Arrivals */}
      <section>
        <SectionHeader
          title="New Arrivals"
          subtitle="Our latest and greatest additions"
          viewAllHref="/products"
        />
        <ProductGrid products={mockProducts} />
      </section>

      {/* Debug Info */}
      <section className="mt-12 p-6 bg-default-50 rounded-xl border border-default-200">
        <h3 className="text-sm font-mono uppercase tracking-widest text-default-400 mb-4">
          Storefront Metadata
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <p>
              <span className="text-default-500">Tenant ID:</span> {tenant.id}
            </p>
            <p>
              <span className="text-default-500">Hostname:</span> {host}
            </p>
          </div>
          <div className="space-y-1">
            <p>
              <span className="text-default-500">Backend URL:</span>{" "}
              {tenant.backendUrl}
            </p>
            <p>
              <span className="text-default-500">Primary Color:</span>{" "}
              {tenant.theme.primaryColor}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
