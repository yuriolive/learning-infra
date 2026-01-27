"use client";

import { Button, Checkbox, Input, Link } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { PasswordInput } from "./password-input";

export const EmailLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async () => {
    setLoading(true);
    await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          setLoading(false);
          toast.success("Logged in successfully");
          router.push("/");
        },
        onError: (ctx) => {
          setLoading(false);
          toast.error(ctx.error.message);
        },
      }
    );
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleEmailLogin();
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
