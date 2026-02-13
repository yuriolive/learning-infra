"use client";

import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Link,
} from "@heroui/react";
import {
  ShoppingCart as LucideShoppingCart,
  User as LucideUser,
} from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";

import type { IconComponent } from "../../types/icons";
import type { Tenant } from "../../types/tenant";

const ShoppingCart = LucideShoppingCart as unknown as IconComponent;
const User = LucideUser as unknown as IconComponent;

interface StorefrontNavbarProperties {
  tenant: Tenant;
}

export function StorefrontNavbar({ tenant }: StorefrontNavbarProperties) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen} maxWidth="xl" position="sticky">
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <NextLink href="/" className="flex items-center gap-2">
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
              <span className="font-bold text-2xl tracking-tighter text-foreground">
                {tenant.name}
              </span>
            )}
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.name}>
            <Link color="foreground" as={NextLink} href={item.href}>
              {item.name}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            as={NextLink}
            isIconOnly
            variant="light"
            href="/account"
            aria-label="Account"
          >
            <User size={24} />
          </Button>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={NextLink}
            color="primary"
            href="/cart"
            variant="flat"
            startContent={<ShoppingCart size={20} />}
          >
            <span className="hidden sm:inline">Cart</span>
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold ml-1">
              0
            </span>
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              color="foreground"
              className="w-full"
              as={NextLink}
              href={item.href}
              size="lg"
            >
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  );
}
