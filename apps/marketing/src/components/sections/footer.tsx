"use client";

import { Divider, Link } from "@heroui/react";
import { LogoPrimary } from "@vendin/assets";
import { Github, Twitter, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "../ui/language-switcher";

export const Footer = () => {
  const t = useTranslations("Footer");

  return (
    <footer className="py-16 bg-default-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-bold mb-4">{t("product")}</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("integrations")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("changelog")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">{t("company")}</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("blog")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("careers")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">{t("resources")}</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  {t("documentation")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("apiReference")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("statusPage")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("community")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">{t("legal")}</h4>
            <ul className="space-y-2 text-sm text-default-500">
              <li>
                <Link href="#" color="foreground">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("termsOfService")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("security")}
                </Link>
              </li>
              <li>
                <Link href="#" color="foreground">
                  {t("gdpr")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Divider />

        <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-default-400 hover:text-foreground transition-colors"
          >
            <LogoPrimary size={32} />
            <span>{t("copyright")}</span>
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <LanguageSwitcher />
            <div className="flex gap-4">
              <Link href="#" color="foreground">
                <Github size={20} />
              </Link>
              <Link href="#" color="foreground">
                <Twitter size={20} />
              </Link>
              <Link href="#" color="foreground">
                <MessageCircle size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
