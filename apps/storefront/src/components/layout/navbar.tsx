"use client";

import { Button } from "@heroui/react";
import { SharedNavbar } from "@vendin/ui";
import {
  ShoppingCart as LucideShoppingCart,
  User as LucideUser,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { IconComponent } from "../../types/icons";
import type { Tenant } from "../../types/tenant";

const ShoppingCart = LucideShoppingCart as unknown as IconComponent;
const User = LucideUser as unknown as IconComponent;

interface StorefrontNavbarProperties {
  tenant: Tenant;
}

export function StorefrontNavbar({ tenant }: StorefrontNavbarProperties) {
  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  const brand = (
    <div className="flex items-center gap-2">
      {tenant.theme.logoUrl ? (
        <Image
          src={tenant.theme.logoUrl}
          alt={tenant.name}
          height={40}
          width={160}
          className="h-10 w-auto object-contain"
          priority
        />
      ) : (
        <span className="font-black text-2xl tracking-tighter text-foreground">
          {tenant.name}
        </span>
      )}
    </div>
  );

  const actions = (
    <>
      <Button
        as={Link}
        isIconOnly
        variant="light"
        href="/account"
        aria-label="Account"
        className="hover:scale-110 transition-transform"
      >
        <User size={20} />
      </Button>
      <Button
        as={Link}
        color="primary"
        href="/cart"
        variant="flat"
        className="font-bold gap-2 hover:translate-y-[-2px] transition-all"
        startContent={<ShoppingCart size={18} />}
      >
        <span className="hidden sm:inline">Cart</span>
        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-black">
          0
        </div>
      </Button>
    </>
  );

  return (
    <SharedNavbar
      brand={brand}
      menuItems={menuItems}
      actions={actions}
      linkComponent={Link}
    />
  );
}
