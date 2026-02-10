import Link from "next/link";

import type { Tenant } from "../../types/tenant";

interface StorefrontFooterProperties {
  tenant: Tenant;
}

function FooterBrand({ name }: { name: string }) {
  return (
    <div className="col-span-2 md:col-span-1">
      <span className="text-xl font-bold">{name}</span>
      <p className="mt-4 text-default-500 text-sm">
        Powered by Vendin - The fully agentic multi-tenant e-commerce platform.
      </p>
    </div>
  );
}

function FooterBottom({ name, year }: { name: string; year: number }) {
  return (
    <div className="mt-8 border-t border-default-200 pt-8 flex flex-col md:flex-row justify-between items-center">
      <p className="text-default-400 text-sm">
        &copy; {year} {name}. All rights reserved.
      </p>
      <div className="mt-4 md:mt-0 flex space-x-6">
        <span className="text-default-400 text-xs">
          Built with <b>Vendin</b>
        </span>
      </div>
    </div>
  );
}

function FooterSection({
  title,
  links,
}: {
  title: string;
  links: Array<{ name: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-default-900 tracking-wider uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-4">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-sm text-foreground hover:opacity-80"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StorefrontFooter({ tenant }: StorefrontFooterProperties) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-default-50 border-t border-default-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <FooterBrand name={tenant.name} />
          <FooterSection
            title="Shop"
            links={[
              { name: "All Products", href: "/products" },
              { name: "Categories", href: "/categories" },
              { name: "Featured", href: "/featured" },
            ]}
          />
          <FooterSection
            title="Support"
            links={[
              { name: "Contact Us", href: "/contact" },
              { name: "Shipping Info", href: "/shipping" },
              { name: "Returns", href: "/returns" },
            ]}
          />
          <FooterSection
            title="Legal"
            links={[
              { name: "Privacy Policy", href: "/privacy" },
              { name: "Terms of Service", href: "/terms" },
            ]}
          />
        </div>
        <FooterBottom name={tenant.name} year={currentYear} />
      </div>
    </footer>
  );
}
