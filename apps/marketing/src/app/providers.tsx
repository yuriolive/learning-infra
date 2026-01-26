"use client";

import { HeroUIProvider } from "@heroui/react";
import { PostHogProvider } from "@vendin/analytics/react";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <PostHogProvider>
      <HeroUIProvider
        navigate={(path: string) => {
          router.push(path);
        }}
      >
        {children}
      </HeroUIProvider>
    </PostHogProvider>
  );
}
