"use client";

import { Button, Checkbox, Input, Link } from "@heroui/react";
import { useEmailAuth } from "../../hooks/use-email-auth";
import { PasswordInput } from "./password-input";

export const EmailLoginForm = () => {
  const { email, setEmail, password, setPassword, loading, submit } = useEmailAuth("login");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Input
        label="Email"
        placeholder="Enter your email"
        type="email"
        variant="bordered"
        value={email}
        onValueChange={setEmail}
      />
      <PasswordInput value={password} onValueChange={setPassword} />
      <div className="flex py-2 px-1 justify-between">
        <Checkbox classNames={{ label: "text-small" }}>Remember me</Checkbox>
        <Link color="primary" href="#" size="sm">
          Forgot password?
        </Link>
      </div>
      <Button color="primary" fullWidth size="lg" type="submit" isLoading={loading}>
        Log In
      </Button>
    </form>
  );
};
