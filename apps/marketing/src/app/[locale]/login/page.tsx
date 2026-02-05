"use client";

import { Link as HeroLink, Tabs, Tab } from "@heroui/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "../../../i18n/routing";

import { AuthCardWrapper } from "../../../components/auth/auth-card-wrapper";
import { EmailLoginForm } from "../../../components/auth/email-login-form";
import { WhatsAppAuthForm } from "../../../components/auth/whatsapp-auth-form";

export default function LoginPage() {
  const [selected, setSelected] = useState("email");
  const t = useTranslations("Login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <AuthCardWrapper
        title={t("title")}
        subtitle={t("subtitle")}
        footerContent={
          <p className="text-small text-default-500">
            {t("noAccount")}{" "}
            <HeroLink as={NextLink} size="sm" href="/signup">
              {t("signup")}
            </HeroLink>
          </p>
        }
      >
        <Tabs
          fullWidth
          size="md"
          aria-label="Login methods"
          selectedKey={selected}
          onSelectionChange={(key) => {
            setSelected(key as string);
          }}
          className="mb-4"
        >
          <Tab key="email" title={t("email")}>
            <EmailLoginForm />
          </Tab>
          <Tab key="whatsapp" title={t("whatsapp")}>
            <WhatsAppAuthForm />
          </Tab>
        </Tabs>
      </AuthCardWrapper>
    </div>
  );
}
