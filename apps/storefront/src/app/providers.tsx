"use client";

import { HeroUIProvider } from "@heroui/react";
import { PostHogProvider } from "@vendin/analytics/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <HeroUIProvider>{children}</HeroUIProvider>
    </PostHogProvider>
  );
}
