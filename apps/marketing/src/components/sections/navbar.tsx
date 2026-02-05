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
import { LogoPrimary } from "@vendin/assets";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "../../i18n/routing";

import { ThemeSwitch } from "../ui/theme-switch";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("Navbar");

  const menuItems = [
    { name: t("features"), href: "#features" },
    { name: t("pricing"), href: "#pricing" },
    { name: t("about"), href: "#about" },
    { name: t("login"), href: "/login" },
    { name: t("signup"), href: "/signup" },
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
          <HeroLink as={NextLink} href="/" className="flex items-center gap-2">
            <LogoPrimary size={40} className="text-foreground" />
            <span className="font-black text-2xl tracking-tighter text-foreground">
              Vendin
            </span>
          </HeroLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        <NavbarItem>
          <HeroLink
            as={NextLink}
            color="foreground"
            href="#features"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {t("features")}
          </HeroLink>
        </NavbarItem>
        <NavbarItem>
          <HeroLink
            as={NextLink}
            color="foreground"
            href="#pricing"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {t("pricing")}
          </HeroLink>
        </NavbarItem>
        <NavbarItem>
          <HeroLink
            as={NextLink}
            color="foreground"
            href="#about"
            className="text-sm font-semibold hover:text-primary transition-colors"
          >
            {t("about")}
          </HeroLink>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden lg:flex">
          <HeroLink
            as={NextLink}
            href="/login"
            color="foreground"
            className="text-sm font-semibold"
          >
            {t("login")}
          </HeroLink>
        </NavbarItem>
        <NavbarItem className="flex items-center">
          <Button
            as={NextLink}
            color="primary"
            href="/signup"
            variant="flat"
            className="font-bold whitespace-nowrap"
          >
            {t("signup")}
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <HeroLink
              as={NextLink}
              color="foreground"
              className="w-full"
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
};
