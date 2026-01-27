"use client";

import { Card, CardHeader, CardBody, CardFooter, Divider } from "@heroui/react";

import { SocialLoginButtons } from "./social-login-buttons";

import type { ReactNode } from "react";

interface AuthCardWrapperProperties {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerContent?: ReactNode;
  socialActionPrefix?: string;
}

export const AuthCardWrapper = ({
  title,
  subtitle,
  children,
  footerContent,
  socialActionPrefix,
}: AuthCardWrapperProperties) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-small text-default-500">{subtitle}</p>
      </CardHeader>

      <CardBody className="gap-4 px-8 py-8">
        <SocialLoginButtons actionPrefix={socialActionPrefix} />

        <div className="flex items-center gap-4 py-2">
          <Divider className="flex-1" />
          <p className="text-tiny text-default-400">OR</p>
          <Divider className="flex-1" />
        </div>

        {children}
      </CardBody>

      {footerContent && (
        <CardFooter className="justify-center pb-8 pt-0">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
};
