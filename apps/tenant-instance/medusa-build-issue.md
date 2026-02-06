# Medusa 2.0 Build Issue: Admin Dashboard Missing

## Problem Summary
Deploying the `tenant-instance` (Medusa 2.0) to Google Cloud Run fails because the admin dashboard artifacts are not found at runtime.

**Production Error:**
`Could not find index.html in the admin build directory. Make sure to run 'medusa build' before starting the server.`

## Root Cause Analysis
During the Docker `builder` stage, the `medusa build` command fails silently (it exits with code 0 but doesn't generate artifacts) due to an internal `TypeError`.

**Observed Build Error (from `docker build --progress=plain`):**
```text
TypeError: Cannot read properties of null (reading 'admin')
    at ConfigManager.loadConfig (/app/node_modules/.../@medusajs/framework/src/config/config.ts:199:28)
    at configLoader (/app/node_modules/.../@medusajs/framework/src/config/loader.ts:48:24)
    at async initializeContainer (/app/node_modules/.../@medusajs/medusa/src/loaders/index.ts:141:21)
    at async build (/app/node_modules/.../@medusajs/medusa/src/commands/build.ts:13:21)
```
This error indicates that the Medusa `ConfigManager` is receiving a `null` configuration object when attempting to load `medusa-config.ts` in the Docker environment.

## What has been tried
1. **Build-time Environment Variables:** Added dummy values for `DATABASE_URL` and `REDIS_URL` in the Dockerfile `builder` stage, as Medusa's config loader often fails if these are missing.
2. **Simplified Configuration:** Reduced `medusa-config.ts` to the absolute minimum, removing all modules and complex logic.
3. **Restored Working Config:** Used a known-working configuration from a previous commit.
4. **Alpine/Node Environment:** Verified the issue persists in `node:20-alpine`.
5. **Dockerfile Structure:** Re-architected the Dockerfile to explicitly copy build outputs (`dist/*`) into the location expected by Medusa for production (`.medusa/server/`).

## Environment Details
- **Medusa Version:** 2.13.1
- **Medusa Framework:** 2.13.1
- **Package Manager:** PNPM 9.15.4 (Turbo monorepo)
- **Runtime:** Node.js 20 (Alpine)
- **Platform:** Google Cloud Run (Docker)

## Current Objective
Determine why the Medusa configuration loader fails inside the Docker container while working perfectly on the local host (Windows). Specifically, we need to identify what prevents `ConfigManager.loadConfig` from successfully parsing `medusa-config.ts` in the `node:20-alpine` environment.
