"use client";

import { Button, Input, Checkbox, Link, Tabs, Tab } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthCardWrapper } from "../../components/auth/auth-card-wrapper";
import { PasswordInput } from "../../components/auth/password-input";
import { authClient } from "../../lib/auth-client";

export default function LoginPage() {
  const [selected, setSelected] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async () => {
    setLoading(true);
    await authClient.signIn.email({
      email,
      password,
      callbackURL: "/"
    }, {
        onSuccess: () => {
            setLoading(false);
            router.push("/");
        },
        onError: (ctx) => {
            setLoading(false);
            alert(ctx.error.message);
        }
    });
  };

  const handleWhatsAppSendOtp = async () => {
     setLoading(true);
     await authClient.phoneNumber.sendOtp({
         phoneNumber: phone,
     }, {
         onSuccess: () => {
             setLoading(false);
             setOtpSent(true);
         },
         onError: (ctx) => {
             setLoading(false);
             alert(ctx.error.message);
         }
     });
  };

  const handleWhatsAppVerify = async () => {
      setLoading(true);
      await authClient.phoneNumber.verify({
          phoneNumber: phone,
          code: otp,
      }, {
          onSuccess: () => {
              setLoading(false);
              router.push("/");
          },
          onError: (ctx) => {
              setLoading(false);
              alert(ctx.error.message);
          }
      });
  };

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
          onSelectionChange={(key) => setSelected(key as string)}
          className="mb-4"
        >
            <Tab key="email" title="Email">
                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleEmailLogin(); }}>
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
                        <Link color="primary" href="#" size="sm">Forgot password?</Link>
                    </div>
                    <Button color="primary" fullWidth size="lg" type="submit" isLoading={loading}>
                        Log In
                    </Button>
                </form>
            </Tab>
            <Tab key="whatsapp" title="WhatsApp">
                <form className="flex flex-col gap-4" onSubmit={(e) => {
                    e.preventDefault();
                    if (otpSent) {
                        handleWhatsAppVerify();
                    } else {
                        handleWhatsAppSendOtp();
                    }
                }}>
                     <Input
                        label="Phone Number"
                        placeholder="+1234567890"
                        type="tel"
                        variant="bordered"
                        value={phone}
                        onValueChange={setPhone}
                        isDisabled={otpSent}
                    />
                    {otpSent && (
                        <Input
                            label="Verification Code"
                            placeholder="123456"
                            type="text"
                            variant="bordered"
                            value={otp}
                            onValueChange={setOtp}
                        />
                    )}
                    <Button color="primary" fullWidth size="lg" type="submit" isLoading={loading}>
                        {otpSent ? "Verify & Login" : "Send Code"}
                    </Button>
                     {otpSent && (
                        <div className="flex justify-center">
                            <Link size="sm" className="cursor-pointer" onPress={() => setOtpSent(false)}>
                                Change phone number
                            </Link>
                        </div>
                    )}
                </form>
            </Tab>
        </Tabs>
      </AuthCardWrapper>
    </div>
  );
}
