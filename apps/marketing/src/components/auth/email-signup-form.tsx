"use client";

import { Button, Checkbox, Input, Link } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { PasswordInput } from "./password-input";

export const EmailSignupForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignup = async () => {
    setLoading(true);
    await authClient.signUp.email(
      {
        email,
        password,
        name,
        callbackURL: "/",
      },
      {
        onSuccess: () => {
          setLoading(false);
          toast.success("Account created successfully");
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
        void handleEmailSignup();
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
