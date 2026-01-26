"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import React, { Suspense, useEffect } from "react";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParameters = useSearchParams();

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
  }, [pathname, searchParameters]);

  return null;
}

interface PostHogProviderProperties {
  children: React.ReactNode;
  apiKey?: string;
  host?: string;
}

export function PostHogProvider({
  children,
  apiKey,
  host,
}: PostHogProviderProperties) {
  useEffect(() => {
    const key = apiKey || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost =
      host || process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

    if (key) {
      posthog.init(key, {
        api_host: apiHost,
        person_profiles: "identified_only",
        capture_pageview: false, // Manually handled for SPA
        capture_pageleave: true,
        enable_recording_console_log: true, // Auto capture console errors
      });
    }
  }, [apiKey, host]);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
