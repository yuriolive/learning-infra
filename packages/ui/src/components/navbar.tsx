"use client";

import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link as HeroLink,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react";
import { useState } from "react";

export interface NavMenuItem {
  name: string;
  href: string;
}

export interface SharedNavbarProperties {
  brand: React.ReactNode;
  menuItems: NavMenuItem[];
  actions: React.ReactNode;
  linkComponent?: React.ElementType;
}

export function SharedNavbar({
  brand,
  menuItems,
  actions,
  linkComponent,
}: SharedNavbarProperties) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        />
        <NavbarBrand>{brand}</NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.name}>
            <HeroLink
              {...(linkComponent ? { as: linkComponent } : {})}
              color="foreground"
              href={item.href}
              className="text-sm font-semibold hover:text-primary transition-all duration-300"
            >
              {item.name}
            </HeroLink>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">{actions}</NavbarContent>

      <NavbarMenu className="bg-background/95 backdrop-blur-md pt-6">
        {menuItems.map((item) => (
          <NavbarMenuItem key={item.name}>
            <HeroLink
              {...(linkComponent ? { as: linkComponent } : {})}
              color="foreground"
              className="w-full text-lg py-2"
              href={item.href}
              size="lg"
            >
              {item.name}
            </HeroLink>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroNavbar>
  );
}
