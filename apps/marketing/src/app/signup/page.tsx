"use client";

import { Button, Input, Checkbox, Link, Divider, Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Github, Twitter, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function SignupPage() {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => { setIsVisible(!isVisible); };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-8">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-small text-default-500">Enter your details to get started</p>
        </CardHeader>

        <CardBody className="gap-4 px-8 py-8">
            <div className="flex flex-col gap-2">
                <Button variant="bordered" startContent={<Github size={20} />}>
                    Sign up with GitHub
                </Button>
                <Button variant="bordered" startContent={<Twitter size={20} />}>
                    Sign up with Twitter
                </Button>
            </div>

            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny text-default-400">OR</p>
                <Divider className="flex-1" />
            </div>

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
                <Input
                    label="Password"
                    placeholder="Create a password"
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
                 <Checkbox
                    classNames={{
                        label: "text-small",
                    }}
                    defaultSelected
                >
                    I agree to the <Link href="#" size="sm">Terms</Link> and <Link href="#" size="sm">Privacy Policy</Link>
                </Checkbox>
                <Button color="primary" fullWidth size="lg">
                    Get Started
                </Button>
            </form>
        </CardBody>
        <CardFooter className="justify-center pb-8 pt-0">
             <p className="text-small text-default-500">
                Already have an account?{" "}
                <Link size="sm" href="/login">
                    Log in
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
