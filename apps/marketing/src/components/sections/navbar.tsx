"use client";

import { NavbarItem, Button, Link as HeroLink } from "@heroui/react";
import { LogoPrimary } from "@vendin/assets";
import { SharedNavbar } from "@vendin/ui";
import { useTranslations } from "next-intl";

import { Link as NextLink } from "../../i18n/routing";
import { ThemeSwitch } from "../ui/theme-switch";

export const Navbar = () => {
  const t = useTranslations("Navbar");

  const menuItems = [
    { name: t("features"), href: "#features" },
    { name: t("pricing"), href: "#pricing" },
    { name: t("about"), href: "#about" },
  ];

  const brand = (
    <div className="flex items-center gap-2">
      <LogoPrimary size={40} className="text-foreground" />
      <span className="font-black text-2xl tracking-tighter text-foreground">
        Vendin
      </span>
    </div>
  );

  const actions = (
    <>
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
    </>
  );

  return (
    <SharedNavbar
      brand={brand}
      menuItems={menuItems}
      actions={actions}
      linkComponent={NextLink}
    />
  );
};
