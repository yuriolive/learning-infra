"use client";

import { Link, Tabs, Tab } from "@heroui/react";
import { useState } from "react";

import { AuthCardWrapper } from "../../components/auth/auth-card-wrapper";
import { EmailSignupForm } from "../../components/auth/email-signup-form";
import { WhatsAppAuthForm } from "../../components/auth/whatsapp-auth-form";

export default function SignupPage() {
  const [selected, setSelected] = useState("email");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <AuthCardWrapper
        title="Create an account"
        subtitle="Enter your details to get started"
        socialActionPrefix="Sign up with"
        footerContent={
          <p className="text-small text-default-500">
            Already have an account?{" "}
            <Link size="sm" href="/login">
              Log in
            </Link>
          </p>
        }
      >
        <Tabs
          fullWidth
          size="md"
          aria-label="Signup methods"
          selectedKey={selected}
          onSelectionChange={(key) => { setSelected(key as string); }}
          className="mb-4"
        >
          <Tab key="email" title="Email">
            <EmailSignupForm />
          </Tab>
          <Tab key="whatsapp" title="WhatsApp">
            <WhatsAppAuthForm />
          </Tab>
        </Tabs>
      </AuthCardWrapper>
    </div>
  );
}
