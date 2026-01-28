"use client";

import { Button, Checkbox, Input, Link } from "@heroui/react";
import { useEmailAuth } from "../../hooks/use-email-auth";
import { PasswordInput } from "./password-input";

export const EmailSignupForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    loading,
    submit,
  } = useEmailAuth("signup");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Input
        label="Full Name"
        placeholder="John Doe"
        type="text"
        variant="bordered"
        value={name}
        onValueChange={setName}
      />
      <Input
        label="Email"
        placeholder="Enter your email"
        type="email"
        variant="bordered"
        value={email}
        onValueChange={setEmail}
      />
      <PasswordInput
        label="Password"
        placeholder="Create a password"
        value={password}
        onValueChange={setPassword}
      />
      <Checkbox classNames={{ label: "text-small" }} defaultSelected>
        I agree to the{" "}
        <Link href="#" size="sm">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" size="sm">
          Privacy Policy
        </Link>
      </Checkbox>
      <Button color="primary" fullWidth size="lg" type="submit" isLoading={loading}>
        Get Started
      </Button>
    </form>
  );
};
