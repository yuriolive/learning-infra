import { Button, Input, Checkbox, Link } from "@heroui/react";

import { AuthCardWrapper } from "../../components/auth/auth-card-wrapper";
import { PasswordInput } from "../../components/auth/password-input";

export default function LoginPage() {
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
        <form className="flex flex-col gap-4">
          <Input
            label="Email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
          />
          <PasswordInput />
          <div className="flex py-2 px-1 justify-between">
            <Checkbox
              classNames={{
                label: "text-small",
              }}
            >
              Remember me
            </Checkbox>
            <Link color="primary" href="#" size="sm">
              Forgot password?
            </Link>
          </div>
          <Button color="primary" fullWidth size="lg">
            Log In
          </Button>
        </form>
      </AuthCardWrapper>
    </div>
  );
}
