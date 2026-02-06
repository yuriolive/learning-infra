"use client";

import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link as HeroLink,
  Button,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react";
import {
  Menu as LucideMenu,
  X as LucideX,
  ShoppingCart as LucideShoppingCart,
  User as LucideUser,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Tenant } from "../../types/tenant";

// Cast Lucide icons to a generic functional component type to avoid monorepo type mismatches while satisfying ESLint
type IconComponent = (properties: {
  size?: number;
  className?: string;
  [key: string]: unknown;
}) => React.ReactNode;
const Menu = LucideMenu as unknown as IconComponent;
const X = LucideX as unknown as IconComponent;
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
    <HeroNavbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="xl"
      position="sticky"
      isBordered
      className="bg-background/60 backdrop-blur-md border-default-100"
      height="4.5rem"
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
          icon={(isOpen) => (isOpen ? <X size={24} /> : <Menu size={24} />)}
        />
        <NavbarBrand>
          <HeroLink as={Link} href="/" className="flex items-center gap-2">
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
          </HeroLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.name}>
            <HeroLink
              as={Link}
              color="foreground"
              href={item.href}
              className="text-sm font-semibold hover:text-primary transition-all duration-300"
            >
              {item.name}
            </HeroLink>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex">
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
        </NavbarItem>
        <NavbarItem>
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
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu className="pt-6">
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <HeroLink
              as={Link}
              color="foreground"
              className="w-full text-lg py-2"
              href={item.href}
              size="lg"
            >
              {item.name}
            </HeroLink>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem className="pt-4 border-t border-default-100">
          <HeroLink
            as={Link}
            color="foreground"
            className="w-full text-lg py-2"
            href="/account"
          >
            My Account
          </HeroLink>
        </NavbarMenuItem>
      </NavbarMenu>
    </HeroNavbar>
  );
}
