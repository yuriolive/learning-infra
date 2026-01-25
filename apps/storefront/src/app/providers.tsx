"use client";

import { HeroUIProvider } from "@heroui/react";
import { PostHogProvider } from "@vendin/analytics/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
      host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
    >
      <HeroUIProvider>{children}</HeroUIProvider>
    </PostHogProvider>
  );
}
