import Link from "next/link";

import type { Tenant } from "../../types/tenant";

interface StorefrontFooterProperties {
  tenant: Tenant;
}

export function StorefrontFooter({ tenant }: StorefrontFooterProperties) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-default-50 border-t border-default-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-bold">{tenant.name}</span>
            <p className="mt-4 text-default-500 text-sm">
              Powered by Vendin - The fully agentic multi-tenant e-commerce
              platform.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-default-900 tracking-wider uppercase">
              Shop
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/featured"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Featured
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-default-900 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Returns
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-default-900 tracking-wider uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-foreground hover:opacity-80"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-default-200 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-default-400 text-sm">
            &copy; {currentYear} {tenant.name}. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <span className="text-default-400 text-xs">
              Built with <b>Vendin</b>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
