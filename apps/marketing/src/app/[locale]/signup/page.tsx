"use client";

import { Link as HeroLink, Tabs, Tab } from "@heroui/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "../../../i18n/routing";

import { AuthCardWrapper } from "../../../components/auth/auth-card-wrapper";
import { EmailSignupForm } from "../../../components/auth/email-signup-form";
import { WhatsAppAuthForm } from "../../../components/auth/whatsapp-auth-form";

export default function SignupPage() {
  const [selected, setSelected] = useState("email");
  const t = useTranslations("Signup");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <AuthCardWrapper
        title={t("title")}
        subtitle={t("subtitle")}
        socialActionPrefix="Sign up with"
        footerContent={
          <p className="text-small text-default-500">
            {t("alreadyAccount")}{" "}
            <HeroLink as={NextLink} size="sm" href="/login">
              {t("login")}
            </HeroLink>
          </p>
        }
      >
        <Tabs
          fullWidth
          size="md"
          aria-label="Signup methods"
          selectedKey={selected}
          onSelectionChange={(key) => {
            setSelected(key as string);
          }}
          className="mb-4"
        >
          <Tab key="email" title={t("email")}>
            <EmailSignupForm />
          </Tab>
          <Tab key="whatsapp" title={t("whatsapp")}>
            <WhatsAppAuthForm />
          </Tab>
        </Tabs>
      </AuthCardWrapper>
    </div>
  );
}
