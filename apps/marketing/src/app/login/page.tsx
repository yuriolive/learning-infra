"use client";

import { Button, Input, Checkbox, Link, Divider, Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Github, Twitter, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-8">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-small text-default-500">Log in to your account to continue</p>
        </CardHeader>

        <CardBody className="gap-4 px-8 py-8">
            <div className="flex flex-col gap-2">
                <Button variant="bordered" startContent={<Github size={20} />}>
                    Continue with GitHub
                </Button>
                <Button variant="bordered" startContent={<Twitter size={20} />}>
                    Continue with Twitter
                </Button>
            </div>

            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny text-default-400">OR</p>
                <Divider className="flex-1" />
            </div>

            <form className="flex flex-col gap-4">
                <Input
                    label="Email"
                    placeholder="Enter your email"
                    type="email"
                    variant="bordered"
                />
                <Input
                    label="Password"
                    placeholder="Enter your password"
                    type={isVisible ? "text" : "password"}
                    variant="bordered"
                    endContent={
                        <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                            {isVisible ? (
                                <EyeOff className="text-default-400 pointer-events-none" size={24} />
                            ) : (
                                <Eye className="text-default-400 pointer-events-none" size={24} />
                            )}
                        </button>
                    }
                />
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
        </CardBody>
        <CardFooter className="justify-center pb-8 pt-0">
             <p className="text-small text-default-500">
                Don&apos;t have an account?{" "}
                <Link size="sm" href="/signup">
                    Sign up
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
