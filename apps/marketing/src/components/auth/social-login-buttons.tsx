"use client";

import { Button } from "@heroui/react";
import { Github, Twitter } from "lucide-react";

interface SocialLoginButtonsProperties {
  actionPrefix?: string;
}

export const SocialLoginButtons = ({
  actionPrefix = "Continue with",
}: SocialLoginButtonsProperties) => {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="bordered" startContent={<Github size={20} />}>
        {actionPrefix} GitHub
      </Button>
      <Button variant="bordered" startContent={<Twitter size={20} />}>
        {actionPrefix} Twitter
      </Button>
    </div>
  );
};
