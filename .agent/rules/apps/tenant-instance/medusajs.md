---
description: MedusaJS 2.0 config-driven patterns for tenant instances.
globs: apps/tenant-instance/**/*
---
# MedusaJS "Mega-Image" Rules

## Core Principle: Single Version, Config Enabled

All tenant instances run the **exact same Docker Image**. Differences are handled exclusively via Environment Variables.

## Plugin Strategy

1.  **Installation**:
    - **ALL** supported plugins (Stripe, SendGrid, ERPs) must be listed in `package.json` and installed in the image.
    - **Do NOT** conditionally install dependencies.

2.  **Registration (`medusa-config.ts`)**:
    - Plugins must be conditionally added to the `plugins` array based on Env Vars.

    ```typescript
    // Example Pattern
    const plugins = [];

    if (process.env.MEDUSA_PAYMENT_STRIPE === "true") {
      plugins.push({
        resolve: "medusa-payment-stripe",
        options: { ... }
      });
    }
    ```

3.  **Safety**:
    - Ensure the app does **not crash** if a plugin is enabled but missing secrets (log a warning instead).

## Deployment

- **Immutable Images**: Never build a custom image for a tenant.
- **Rollouts**: A new feature release = updating the Image Tag on ALL Cloud Run services.

## Database

- **Migrations**: Run migrations automatically on container start (or via init container) since code version matches DB schema version.
