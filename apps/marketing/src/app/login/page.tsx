"use client";

import { Link, Tabs, Tab } from "@heroui/react";
import { useState } from "react";

import { AuthCardWrapper } from "../../components/auth/auth-card-wrapper";
import { EmailLoginForm } from "../../components/auth/email-login-form";
import { WhatsAppAuthForm } from "../../components/auth/whatsapp-auth-form";

export default function LoginPage() {
  const [selected, setSelected] = useState("email");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <AuthCardWrapper
        title="Welcome back"
        subtitle="Log in to your account to continue"
        footerContent={
          <p className="text-small text-default-500">
            Don&apos;t have an account?{" "}
            <Link size="sm" href="/signup">
              Sign up
            </Link>
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
          <Tab key="email" title="Email">
            <EmailLoginForm />
          </Tab>
          <Tab key="whatsapp" title="WhatsApp">
            <WhatsAppAuthForm />
          </Tab>
        </Tabs>
      </AuthCardWrapper>
    </div>
  );
}
