# API Contracts

This document outlines the consumer-driven contracts currently verified in the platform. Contracts are defined and verified using [Pact](https://docs.pact.io/).

## 1. Storefront -> Control Plane (Tenant Resolution)

**Consumer:** `storefront` (Next.js Application)
**Provider:** `control-plane` (Cloudflare Worker)

### Purpose
The storefront depends on the control-plane to resolve an incoming hostname (or subdomain) into the full tenant configuration. This allows the storefront to properly brand the UI, set cookies securely, and proxy traffic to the right Cloud Run instance. If this contract breaks, the storefront application will not be able to render pages for any merchant.

### Endpoint
`GET /api/tenants?subdomain={subdomain}`

### Request Shape
The storefront expects to be able to make a request exactly like this:

```json
{
  "method": "GET",
  "path": "/api/tenants",
  "query": {
    "subdomain": "test-store"
  },
  "headers": {
    "Authorization": "Bearer {ADMIN_API_KEY}"
  }
}
```

### Expected Response Shape
The storefront expects a 200 OK response with a JSON array containing at least one tenant object with the following required properties:

```json
[
  {
    "id": "tenant-123",            // String (UUID/ID)
    "name": "Test Tenant",         // String
    "subdomain": "test-store",     // String
    "apiUrl": "https://...",       // String (Backend Cloud Run URL)
    "metadata": {
      "theme": {
        "primaryColor": "#000000",
        "fontFamily": "Inter",
        "logoUrl": ""
      }
    }
  }
]
```

### Current Test Status
- **Consumer Test:** Passes. Located in `apps/storefront/tests/contracts/control-plane.pact.test.ts`. Generates `storefront-control-plane.json` in `.pact/pacts`.
- **Provider Test:** Skipped / WIP. Located in `apps/control-plane/tests/contracts/storefront-consumer.pact.test.ts`. There are currently issues routing the Pact Verifier's request through the mock Node `Request/Response` adapters, resulting in 404s and Vitest worker crashes (`ERR_IPC_CHANNEL_CLOSED`).
