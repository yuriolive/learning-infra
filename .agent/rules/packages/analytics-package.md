---
description: Guidelines for using the @vendin/analytics package, including PostHog initialization and error capture.
globs: packages/analytics/**/*, apps/**/*
---
# Analytics Package (@vendin/analytics)

The analytics package provides a unified interface for event tracking and error reporting using PostHog.

## Core Features

- **Singleton Client**: Centralized PostHog client for backend services.
- **React Integration**: Custom `PostHogProvider` and pageview tracking for Next.js.
- **Error Capture**: Helper functions for reporting exceptions with context.

## Initialization

### Backend (Node.js)

```typescript
import { initAnalytics } from "@vendin/analytics";

initAnalytics(process.env.POSTHOG_API_KEY, {
  host: process.env.POSTHOG_HOST
});
```

- **Note**: Always call `initAnalytics` before using `captureError` or other tracking functions.
- **Note**: In local development, the client might be disabled if keys are missing.

### Frontend (React/Next.js)

Use the `PostHogProvider` at the root of your application (usually in `providers.tsx`).

```tsx
import { PostHogProvider } from "@vendin/analytics/react";

export function Providers({ children }) {
  return (
    <PostHogProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
      host={process.env.NEXT_PUBLIC_POSTHOG_HOST}
    >
      {children}
    </PostHogProvider>
  );
}
```

## Error Capture

Use `captureError` to report exceptions to PostHog.

```typescript
import { captureError } from "@vendin/analytics";

try {
  // logic
} catch (error) {
  captureError(error, {
    tenantId: "tenant-123",
    action: "provision-failed"
  });
}
```

## Implementation Best Practices

1. **Strict Types**: The tests use `@ts-expect-error` specifically for `process.env.NODE_ENV` overrides due to `exactOptionalPropertyTypes`. Follow this pattern when testing environment-specific logic.
2. **Built-in Initialization**: In `react.tsx`, `PostHogProvider` handles its own initialization. Do not call `posthog.init` manually in components.
3. **Singleton Pattern**: Access the client via the package exports, not by creating new instances of `PostHog`.
4. **Environment Variables**:
   - Backend: `POSTHOG_API_KEY`, `POSTHOG_HOST`.
   - Frontend: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.

## Testing

When writing tests for analytics:
- Use `mock.module("posthog-node", ...)` to intercept PostHog calls.
- Use the exported `__resetClient()` helper to ensure test isolation between cases that initialize the client.
