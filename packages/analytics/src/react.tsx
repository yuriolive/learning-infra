"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import React, { Suspense, useEffect } from "react";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      let url = globalThis.origin + pathname;
      if (searchParameters.toString()) {
        url = url + `?${searchParameters.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParameters, posthog]);

  return null;
}

interface PostHogProviderProperties {
  children: React.ReactNode;
  apiKey?: string;
  host?: string;
}

export function PostHogProvider({
  children,
  apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host = process.env.NEXT_PUBLIC_POSTHOG_HOST,
}: PostHogProviderProperties) {
  return (
    <PHProvider
      {...(apiKey ? { apiKey } : {})}
      options={{
        api_host: host || "https://app.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // Manually handled for SPA
        capture_pageleave: true,
        enable_recording_console_log: true, // Auto capture console errors
      }}
    >
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
