"use client";

import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "../ui/logo";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "About", href: "#about" },
    { name: "Login", href: "/login" },
    { name: "Sign Up", href: "/signup" },
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
          <Link href="/" className="flex items-center gap-2">
            <Logo size={40} className="text-foreground" />
            <span className="font-black text-2xl tracking-tighter text-foreground">
              Vendin
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        <NavbarItem>
          <Link
            color="foreground"
            href="#features"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            Features
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link
            color="foreground"
            href="#pricing"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            Pricing
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link
            color="foreground"
            href="#about"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            About
          </Link>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden lg:flex">
          <Link
            href="/login"
            color="foreground"
            className="text-sm font-semibold"
          >
            Login
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={Link}
            color="primary"
            href="/signup"
            variant="flat"
            className="font-bold whitespace-nowrap"
          >
            Sign Up
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              color="foreground"
              className="w-full"
              href={item.href}
              size="lg"
            >
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroNavbar>
  );
};
