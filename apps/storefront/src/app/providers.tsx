"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { PostHogProvider } from "@vendin/analytics/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <PostHogProvider>
      <HeroUIProvider navigate={router.push}>
        <NextThemesProvider attribute="class" defaultTheme="dark">
          <ToastProvider placement="bottom-right" />
          {children}
        </NextThemesProvider>
      </HeroUIProvider>
    </PostHogProvider>
  );
}
