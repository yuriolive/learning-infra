"use client";

import { Button, Input, Checkbox, Link } from "@heroui/react";

import { AuthCardWrapper } from "../../components/auth/auth-card-wrapper";
import { PasswordInput } from "../../components/auth/password-input";

export default function SignupPage() {
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
        <form className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            type="text"
            variant="bordered"
          />
          <Input
            label="Store Name"
            placeholder="my-awesome-store"
            type="text"
            variant="bordered"
            description="This will be your subdomain"
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
          />
          <PasswordInput label="Password" placeholder="Create a password" />
          <Checkbox
            classNames={{
              label: "text-small",
            }}
            defaultSelected
          >
            I agree to the{" "}
            <Link href="#" size="sm">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" size="sm">
              Privacy Policy
            </Link>
          </Checkbox>
          <Button color="primary" fullWidth size="lg">
            Get Started
          </Button>
        </form>
      </AuthCardWrapper>
    </div>
  );
}
