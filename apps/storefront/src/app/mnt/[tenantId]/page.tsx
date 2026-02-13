import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  HeroSection,
  SectionHeader,
  ProductGrid,
  CategoryGrid,
} from "../../../components";
import { resolveTenant } from "../../../lib/tenant-resolution";

import { mockCategories, mockProducts } from "./mock-data";

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

  return (
    <div>
      {/* Hero Section */}
      <HeroSection
        title={`Welcome to ${tenant.name}`}
        subtitle="Experience our curated collection of high-quality products. Built for speed, security, and scalability."
      />

      <div className="flex flex-col mt-10 gap-20 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </div>
  );
}
