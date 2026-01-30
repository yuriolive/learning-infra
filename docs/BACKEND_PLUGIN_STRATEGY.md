# Backend Plugin Strategy: Multi-Tenant Configuration

This document outlines the strategy for managing distinct plugin configurations (e.g., Stripe vs. MercadoPago) across different tenants using a **Single Docker Image**.

## 1. Core Principle: "The Kitchen Sink" Image

Instead of building unique Docker images for each tenant, we maintain a **unified `tenant-instance` image** that contains all supported plugins.

- **Build Once, Deploy Everywhere**: A single CI pipeline builds the artifact.
- **Runtime Activation**: Plugins are enabled or disabled specifically at **runtime** based on Environment Variables.

---

## 2. Implementation Logic

We utilize conditional logic within `medusa-config.ts` to check for specific credentials before initializing a module.

### 2.1 Configuration Pattern

```typescript
import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// 1. Base Modules (Always Active)
const modules = [
  {
    resolve: "@medusajs/medusa/cache-redis",
    options: { redisUrl: process.env.REDIS_URL },
  },
  {
    resolve: "@medusajs/medusa/event-bus-redis",
    options: { redisUrl: process.env.REDIS_URL },
  },
];

// 2. Conditional Modules (Activated by Env Vars)

// --- Payment Providers ---

// Stripe
if (process.env.STRIPE_API_KEY) {
  modules.push({
    resolve: "@medusajs/medusa/payment-stripe",
    options: {
      apiKey: process.env.STRIPE_API_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  });
}

// MercadoPago
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  modules.push({
    resolve: "medusa-payment-mercadopago",
    options: {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    },
  });
}

// --- Notification Providers ---

// SendGrid
if (process.env.SENDGRID_API_KEY) {
  modules.push({
    resolve: "@medusajs/medusa/notification-sendgrid",
    options: {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM_EMAIL,
    },
  });
}

export default defineConfig({
  projectConfig: {
    // ... standard config
  },
  modules: modules,
});
```

---

## 3. Provisioning Workflow

The **Control Plane** orchestrates the plugin "installation":

1.  **Merchant Action**: Merchant clicks "Install Stripe" in the dashboard and enters their keys.
2.  **Secret Management**: Control Plane saves these keys to **GCP Secret Manager** (or Vault).
3.  **Deployment Update**: Control Plane updates the **Cloud Run Service** for that specific tenant:
    - Injects `STRIPE_API_KEY` as an environment variable.
4.  **Restart**: Cloud Run automatically spins up a new revision.
5.  **Initialization**: The `medusa-config.ts` sees the new variable and initializes the Stripe module.

## 4. Conflict Resolution

If a merchant tries to activate conflicting plugins (e.g., two primary tax providers), the Control Plane validation logic prevents the Env Var injection before it reaches the backend.

## 5. Maintenance Benefits

- **Zero Code Forks**: No per-tenant git branches.
- **Simplified Testing**: Integration tests run against the "Kitchen Sink" configuration to ensure no plugin conflicts exist in the shared codebase.
- **Fast Rollbacks**: Reverting a plugin add is just removing an Env Var.
