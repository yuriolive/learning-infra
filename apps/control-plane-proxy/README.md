# Control Plane Proxy (Cloudflare Worker)

## Why this exists

This worker serves as a proxy for the Control Plane API (`control.vendin.store`). It is necessary for two main reasons:

1. **Regional Limitation**: Our main infrastructure is in `southamerica-east1`. Google Cloud Run does **not** support managed "Domain Mappings" in this region.
2. **Host Header Rewrite**: Google Cloud Run requires the `Host` header of a request to match the actual service URL. Since we are using a custom domain and Cloudflare's Free/Pro plans restrict the "Host Header Rewrite" feature in Origin Rules to Enterprise users, this Worker performs that rewrite programmatically.

## How it works

The worker intercepts requests to `control.vendin.store`, changes the hostname to the actual Google Cloud Run URL (`control-plane-110781160918.southamerica-east1.run.app`), and overrides the `Host` header accordingly before fetching the results from Google.

## Deployment

To deploy or update this worker, ensure you have [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-setup/) installed and authenticated.

```bash
# Navigate to this directory
cd apps/control-plane-proxy

# Install dependencies
bun install

# Deploy to Cloudflare
bun run deploy
```

## Configuration

The configuration is managed in `wrangler.jsonc`.
- **Route**: `control.vendin.store/*`
- **Target**: `control-plane-110781160918.southamerica-east1.run.app`
