# Cloudflare Setup for Multi-Tenant SaaS

- [Cloudflare Setup for Multi-Tenant SaaS](#cloudflare-setup-for-multi-tenant-saas)
  - [Overview](#overview)
  - [Subdomain Structure](#subdomain-structure)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Part A: Marketing + Storefront Router Deployment (Cloudflare Pages)](#part-a-marketing--storefront-router-deployment-cloudflare-pages)
    - [Step 1: Prepare Apps for Deployment](#step-1-prepare-apps-for-deployment)
    - [Step 2: Deploy to Cloudflare](#step-2-deploy-to-cloudflare)
    - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
    - [Step 4: Set Up Custom Domains](#step-4-set-up-custom-domains)
  - [Part B: Cloudflare for SaaS Setup](#part-b-cloudflare-for-saas-setup)
    - [Step 1: Enable Cloudflare for SaaS](#step-1-enable-cloudflare-for-saas)
    - [Step 2: Configure Fallback Origin](#step-2-configure-fallback-origin)
    - [Step 3: Configure SSL/TLS Settings](#step-3-configure-ssltls-settings)
    - [Step 4: Set Up API Credentials](#step-4-set-up-api-credentials)
    - [Step 5: Add API Token to Secret Manager](#step-5-add-api-token-to-secret-manager)
  - [Part C: Custom Hostname Management (API Integration)](#part-c-custom-hostname-management-api-integration)
    - [API Endpoints](#api-endpoints)
    - [DNS Requirements for Merchants](#dns-requirements-for-merchants)
  - [Part D: Subdomain Routing Setup](#part-d-subdomain-routing-setup)
    - [Wildcard DNS for Tenant Subdomains](#wildcard-dns-for-tenant-subdomains)
    - [Architecture Decision: Wildcard SSL vs. Per-Tenant SSL](#architecture-decision-wildcard-ssl-vs-per-tenant-ssl)
  - [Part E: Wildcard SSL Setup (Manual)](#part-e-wildcard-ssl-setup-manual)
    - [Step 1: Create Wildcard Custom Hostname](#step-1-create-wildcard-custom-hostname)
    - [Step 2: Verify Domain Ownership](#step-2-verify-domain-ownership)
    - [Step 3: Monitor Status](#step-3-monitor-status)
    - [Future Roadmap: Switching to Dotted Subdomains](#future-roadmap-switching-to-dotted-subdomains)
    - [Storefront Router Logic](#storefront-router-logic)
  - [Part E: Security Configuration](#part-e-security-configuration)
    - [WAF (Web Application Firewall)](#waf-web-application-firewall)
    - [Rate Limiting](#rate-limiting)
    - [Bot Management](#bot-management)
  - [Part F: Secrets Store Management](#part-f-secrets-store-management)
    - [Why use Secrets Store?](#why-use-secrets-store)
    - [Configuration via Dashboard](#configuration-via-dashboard)
    - [CD Integration (Dynamic Bindings)](#cd-integration-dynamic-bindings)
    - [Accessing via CLI](#accessing-via-cli)
  - [Part G: Monitoring and Analytics](#part-g-monitoring-and-analytics)
    - [Custom Hostname Status Monitoring](#custom-hostname-status-monitoring)
    - [Analytics](#analytics)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Diagnostic Commands](#diagnostic-commands)
  - [Cost Considerations](#cost-considerations)
    - [Free Tier](#free-tier)
    - [Paid Plans](#paid-plans)
  - [Integration with Control Plane](#integration-with-control-plane)
  - [Next Steps](#next-steps)
  - [References](#references)

## Overview

This document provides step-by-step instructions for configuring Cloudflare for your multi-tenant e-commerce platform. This includes:

1. **Marketing App Deployment** (Cloudflare Pages) - Landing page on root domain
2. **Storefront Router Deployment** (Cloudflare Pages) - Router-only app for tenant domains
3. **Cloudflare for SaaS** - Custom domain management per tenant
4. **DNS and SSL Automation** - Automatic SSL provisioning for merchant domains
5. **SSL/TLS Encryption Mode** - Global encryption settings for the platform

## Subdomain Structure

Based on Shopify pattern (`.myshopify.com`), here's the subdomain structure:

```
vendin.store                    → Landing page & Signup (root domain)
www.vendin.store                → Redirects to root or alternative storefront
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*.my.vendin.store               → Tenant stores (wildcard SSL)
  ├─ awesome-store.my.vendin.store → Merchant storefront
  └─ awesome-store.my.vendin.store/admin → Merchant admin (MedusaJS)
```

**Custom Domains (Optional):**

```
shop.merchant.com               → Routes to tenant store
admin.merchant.com              → Routes to tenant admin
```

## Architecture

```
Customer Request Flow:
┌─────────────────┐
│  Customer       │
│  (Browser)      │
└────────┬────────┘
         │
         │ vendin.store (signup) OR
         │ merchant-name.my.vendin.store (store) OR
         │ shop.merchant.com (custom domain)
         ▼
┌─────────────────┐
│ Cloudflare      │  (DNS + SSL + CDN)
│ for SaaS        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Marketing App   │  (Cloudflare Pages - Next.js)
│ (Root domain)   │  - Landing/signup page
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storefront      │  (Cloudflare Pages - Next.js)
│ Router          │  - Tenant subdomain: Resolves tenant
│ (No UI)         │  - Custom domain: Resolves tenant
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tenant Instance │  (Cloud Run - MedusaJS)
│ tenant-{id}     │  (Serves /admin and /store APIs)
└─────────────────┘
```

## Prerequisites

- Cloudflare account (Free tier works for MVP)
- Domain registered for your platform (e.g., `vendin.store`)
- Control Plane deployed and accessible
- Tenant instance container image built and ready

## Part A: Marketing + Storefront Router Deployment (Cloudflare Pages)

### Step 1: Prepare Apps for Deployment

The marketing app and storefront router use **OpenNext** with the Cloudflare adapter for optimal performance:

```bash
# The marketing app and storefront router are pre-configured with:
# - @opennextjs/cloudflare (replaces deprecated @cloudflare/next-on-pages)
# - wrangler.jsonc (Cloudflare Workers configuration)
# - open-next.config.ts (OpenNext configuration)
```

### Step 2: Deploy to Cloudflare

**Option 1: Via Wrangler CLI (Recommended)**

```bash
# Deploy storefront router
cd apps/storefront

# Build and deploy in one command
pnpm run pages:deploy

# Deploy marketing app
cd ../marketing
pnpm run pages:deploy

# Or build first, then deploy
pnpm run pages:build
pnpm run pages:deploy

# This uses OpenNext to:
# 1. Build Next.js with Turbopack
# 2. Generate Cloudflare Worker (.open-next/worker.js)
# 3. Deploy to Cloudflare Workers
```

**Option 2: Via GitHub Actions (Automated)**

The repository includes GitHub Actions workflows that automatically deploy on push to `main`:

```yaml
# .github/workflows/deploy-storefront.yml
# Triggers on:
# - Push to main branch
# - Changes to apps/storefront/** or packages/**
# - Manual workflow dispatch

# .github/workflows/deploy-marketing.yml
# Triggers on:
# - Push to main branch
# - Changes to apps/marketing/** or packages/**
# - Manual workflow dispatch

# Required GitHub Secrets:
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ACCOUNT_ID
```

**First-time setup:**

```bash
# Install Wrangler globally (optional, for local testing)
pnpm add -g wrangler

# Login to Cloudflare
wrangler login

# The first deployment will create the project automatically
pnpm run pages:deploy
```

### Step 3: Configure Environment Variables

Environment variables can be set via:

1. **Cloudflare Dashboard** (for production):
   - Go to Workers & Pages → storefront → Settings → Environment Variables

2. **`.dev.vars` file** (for local development):

   ```bash
   # apps/storefront/.dev.vars (gitignored)
   CONTROL_PLANE_API_URL=https://control.vendin.store
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   NODE_ENV=development
   ```

3. **GitHub Secrets** (for CI/CD):
   ```bash
   # Required secrets in repository settings:
   CLOUDFLARE_API_TOKEN=your-api-token
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   ```

**API Token Permissions:**

Create a Cloudflare API token with:

- **Account** → **Cloudflare Pages** → **Edit**
- **Account** → **Workers Scripts** → **Edit**
- **Account** → **Secrets Store** → **Edit** (Required for binding secrets during deployment)

### Step 4: Set Up Custom Domains

After deployment, configure custom domains:

```bash
# Option 1: Via Cloudflare Dashboard
# Marketing app (root domain):
# 1. Go to Workers & Pages → marketing → Settings → Domains
# 2. Add custom domain: vendin.store
# 3. Add www.vendin.store (optional)
#
# Storefront router (tenant wildcard):
# 1. Go to Workers & Pages → storefront → Settings → Domains
# 2. Keep Pages default domain for wildcard routing

# Option 2: Via Wrangler
wrangler pages deployment tail
```

**Root domain (vendin.store) serves:**

- Marketing landing page
- Pricing and signup
- Platform information

## Part B: Cloudflare for SaaS Setup

Cloudflare for SaaS enables automatic SSL provisioning for custom domains per tenant.

### Step 1: Enable Cloudflare for SaaS

```bash
# In Cloudflare Dashboard:
# 1. Go to SSL/TLS → Custom Hostnames
# 2. Click "Get Started" or "Enable Cloudflare for SaaS"
# 3. Note your Account ID (you'll need this for API calls)
```

### Step 2: Configure Fallback Origin

The fallback origin is where requests go when a custom hostname doesn't match any tenant:

```bash
# In Cloudflare Dashboard → SSL/TLS → Custom Hostnames
# Set Fallback Origin to your storefront URL:
# Example: storefront.pages.dev or vendin.store

# Or via API:
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames/fallback_origin" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"origin":"storefront.pages.dev"}'
```

### Step 3: Configure SSL/TLS Settings

```bash
# In Cloudflare Dashboard → SSL/TLS → Overview
# SSL/TLS encryption mode: Full (strict)
#
# Then in SSL/TLS → Edge Certificates (for basic settings):
# Minimum TLS Version: 1.2
# Always Use HTTPS: On
# Automatic HTTPS Rewrites: On
```

### Step 4: Set Up API Credentials

Your Control Plane needs API access to manage custom hostnames:

```bash
# 1. Go to Cloudflare Dashboard → My Profile → API Tokens
# 2. Create API Token with these permissions:
#    - Account → Secrets Store → Edit (Required for binding secrets)
#    - Account → Workers Scripts → Edit (Required for deployment)
#    - Zone: Zone Settings:Read (optional, for reading zone configuration)
#    - Zone: SSL and Certificates:Read (for listing/reading custom hostnames)
#    - Zone: SSL and Certificates:Write (for creating/editing/deleting custom hostnames)
#    Note: SSL and Certificates Write typically includes read access
# 3. Save the token securely (add to Secret Manager)
```

### Step 5: Add API Token to Secret Manager

```bash
# Store Cloudflare API token in GCP Secret Manager
echo -n "your-cloudflare-api-token" | \
  gcloud secrets create cloudflare-api-token \
    --project=vendin-store \
    --data-file=-

# Grant Control Plane access
gcloud secrets add-iam-policy-binding cloudflare-api-token \
  --project=vendin-store \
  --member="serviceAccount:cloud-run-sa@vendin-store.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Part C: Custom Hostname Management (API Integration)

The Control Plane will use Cloudflare's API to add custom hostnames for each tenant.

### API Endpoints

**Add Custom Hostname:**

```bash
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames
Authorization: Bearer {api_token}
Content-Type: application/json

{
  "hostname": "shop.merchant.com",
  "ssl": {
    "method": "http",
    "type": "dv"
  }
}
```

**Check SSL Status:**

```bash
GET https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames/{hostname_id}
Authorization: Bearer {api_token}
```

**List Custom Hostnames:**

```bash
GET https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames
Authorization: Bearer {api_token}
```

### DNS Requirements for Merchants

When a merchant adds a custom domain, they need to create a CNAME record:

```bash
# Merchant DNS Configuration:
Type: CNAME
Name: shop (or @ for apex domain)
Target: {zone_name}.cdn.cloudflare.net
TTL: Auto
```

**Note**: For apex domains (e.g., `merchant.com`), Cloudflare provides specific instructions. Some registrars support CNAME flattening.

## Part D: Subdomain Routing Setup

### Wildcard DNS for Tenant Subdomains

For default tenant subdomains (e.g., `merchant-name-my.vendin.store`):

```bash
# In Cloudflare DNS → Records
# Add wildcard CNAME for tenant subdomains:
Type: CNAME
Name: *-my
Target: storefront.pages.dev (or your storefront URL)
TTL: Auto
Proxy status: Proxied (orange cloud)

# Note: This wildcard will match:
# - awesome-store-my.vendin.store
# - awesome-store.my.vendin.store
# - any-merchant.my.vendin.store
# But NOT reserved subdomains (api, admin, www) which should have explicit records
```

### Architecture Decision: Wildcard SSL vs. Per-Tenant SSL

Our platform uses a **Wildcard SSL** strategy for all default tenant subdomains under `*.my.vendin.store`.

**Why Wildcard SSL?**

1. **Instant Provisioning**: New tenants don't need to wait for SSL validation.
2. **Simplified Infrastructure**: No need to manage hundreds of individual custom hostnames in Cloudflare for default subdomains.
3. **Bypass Redirect Issues**: Avoids issues where HTTP validation tokens are inaccessible due to automatic HTTPS redirects.

**Implementation**:

- The Control Plane **skips** individual Cloudflare custom hostname creation if the subdomain matches the wildcard base.
- A single one-time setup of `*.my.vendin.store` in Cloudflare covers all subdomains.

## Part E: Wildcard SSL Setup (Manual)

To support dotted subdomains (e.g., `store.my.vendin.store`), you must provision a Wildcard Custom Hostname in Cloudflare once.

### Step 1: Create Wildcard Custom Hostname

**Option 1: Via Cloudflare Dashboard (Recommended)**

1. Go to **SSL/TLS** → **Custom Hostnames**.
2. Click **Add Custom Hostname**.
3. Enter `my.vendin.store` (without the asterisk).
4. **Enable Wildcard**: Ensure the "Wildcard" option is selected/checked (this adds `*.my.vendin.store` as a Subject Alternative Name).
5. Click **Add Custom Hostname**.

**Option 2: Via API**
Execute the following cURL command (replace placeholders with your credentials):

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/custom_hostnames" \
     -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
     -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
     -H "Content-Type: application/json" \
     --data '{
       "hostname": "my.vendin.store",
       "ssl": {
         "method": "txt",
         "type": "dv",
         "wildcard": true
       }
     }'
```

### Step 2: Verify Domain Ownership

The API response will contain an `ownership_verification` object with a TXT record. Add this record to your DNS provider:

- **Type**: `TXT`
- **Name**: `_cf-custom-hostname.my.vendin.store` (example)
- **Value**: `[Verification Token from Response]`

### Step 3: Monitor Status

Check the status until it becomes `active`:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/custom_hostnames?hostname=*.my.vendin.store" \
     -H "Authorization: Bearer {API_TOKEN}"
```

Once active, Cloudflare will automatically serve a valid wildcard certificate for any subdomain under `my.vendin.store`.

### Future Roadmap: Switching to Dotted Subdomains

If you prefer the aesthetic of `store.my.vendin.store` in the future, follow these steps to upgrade:

1.  **Enable Advanced Certificate Manager (ACM)**:
    In the Cloudflare dashboard, subscribe to ACM ($10/mo current pricing). This allows you to generate certificates for deep wildcards.
2.  **Update DNS**:
    Change the wildcard CNAME from `*-my` to `*.my`.
3.  **Update Middleware Logic**:
    Update `resolveTenantFromHostname` in `middleware.ts`:
    ```typescript
    // From:
    if (hostname.endsWith("-my.vendin.store")) {
      const storeName = hostname.replace("-my.vendin.store", "");
    // To:
    if (hostname.endsWith(".my.vendin.store")) {
      const storeName = hostname.replace(".my.vendin.store", "");
    ```
4.  **Note on Custom Domains**:
    This change only affects default subdomains. Custom merchant domains (e.g., `shop.merchant.com`) work regardless of the default pattern.

**Explicit DNS Records for Platform Services:**

```bash
# Root domain (marketing app)
Type: A or CNAME
Name: @
Target: marketing.pages.dev
Proxy status: Proxied

# Control Plane API
Type: CNAME
Name: control
Target: 1.1.1.1 (or any dummy IP)
Proxy status: Proxied (orange cloud)

*Note: The Control Plane is deployed as a Worker located at `apps/control-plane`. Cloudflare will automatically intercept requests to this hostname and execute the Worker logic.*

# Platform Admin (optional)
Type: CNAME
Name: admin
Target: marketing.pages.dev (or separate admin app)
Proxy status: Proxied
```

### Storefront Router Logic

Your Next.js storefront router should handle different hostname patterns:

```typescript
// Example: apps/storefront/src/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Root domain: Redirect to marketing app
  if (hostname === "vendin.store" || hostname === "www.vendin.store") {
    return NextResponse.redirect("https://vendin.store");
  }

  // Control Plane API: Route to control.vendin.store
  if (hostname === "control.vendin.store") {
    // This is handled by Cloudflare proxying to the Cloud Run service URL
    return NextResponse.redirect("https://control.vendin.store");
  }

  // Platform admin: Route to admin.vendin.store
  if (hostname === "admin.vendin.store") {
    // Serve platform admin dashboard
    return NextResponse.next();
  }

  // Tenant subdomain pattern: {store}-my.vendin.store or custom domain
  const tenantId = await resolveTenantFromHostname(hostname);

  if (!tenantId) {
    // Unknown hostname, redirect to marketing site
    return NextResponse.redirect("https://vendin.store");
  }

  // Redirect/proxy to tenant instance
  const tenantUrl = `https://tenant-${tenantId}-xxx.a.run.app`;
  // ... redirect or proxy request to tenant instance
}
```

**Hostname Resolution Logic:**

```typescript
async function resolveTenantFromHostname(
  hostname: string,
): Promise<string | null> {
  // Check if it's a tenant subdomain pattern: {store}.my.vendin.store
  if (hostname.endsWith(".my.vendin.store")) {
    // Extract store name (e.g., "awesome-store" from "awesome-store.my.vendin.store")
    const storeName = hostname.replace(".my.vendin.store", "");

    // Query Control Plane to find tenant by subdomain
    const tenant = await controlPlaneClient.findTenantBySubdomain(storeName);
    return tenant?.id || null;
  }

  // Check if it's a custom domain
  // Query Control Plane to find tenant by custom domain
  const tenant = await controlPlaneClient.findTenantByCustomDomain(hostname);
  return tenant?.id || null;
}

// Note: Both marketing app and storefront router are deployed to Cloudflare Pages
// as separate deployments. Marketing app handles root domain, storefront router
// handles tenant subdomains and custom domains.
```

## Part E: Security Configuration

### WAF (Web Application Firewall)

```bash
# In Cloudflare Dashboard → Security → WAF
# Enable for your zone:
# - OWASP Core Ruleset
# - Cloudflare Managed Ruleset
# - Rate limiting rules
```

### Rate Limiting

```bash
# Security → Rate limiting
# Create rules for:
# - API endpoints: 1000 requests/minute per IP
# - Admin endpoints: 100 requests/minute per IP
# - Storefront: 5000 requests/minute per IP
```

### Bot Management

```bash
# Security → Bots
# Enable: Bot Fight Mode (Free)
# Or: Super Bot Fight Mode (Paid plans)
```

## Part F: Secrets Store Management

Cloudflare **Secrets Store** allows you to securely store and share sensitive information across your entire account.

### Why use Secrets Store?

1. **Shared Access**: Secrets like `DATABASE_URL` or `NEON_API_KEY` can be used by multiple Workers without re-uploading them.
2. **Centralized Management**: Rotate or update secrets in one place instead of per-worker.
3. **Capacity**: Up to 100 secrets per account (Free/Pro).

### Configuration via Dashboard

1. Go to **Storage & Databases** → **Secrets Store**.
2. Click **Create secret**.
3. Use names like `control-plane-db-url`.
4. These secrets are automatically available to your CI/CD pipeline and bound Workers via `secrets_store_secrets`.

### CD Integration (Dynamic Bindings)

To avoid hardcoding Store IDs in the repository, use placeholders in `wrangler.jsonc`:

```jsonc
{
  "env": {
    "production": {
      "secrets_store_secrets": [
        {
          "binding": "DATABASE_URL",
          "store_id": "STORE_ID_PLACEHOLDER",
          "secret_name": "control-plane-db-url",
        },
      ],
    },
  },
}
```

The GitHub Actions workflow replaces `STORE_ID_PLACEHOLDER` with the value from the `CLOUDFLARE_SECRETS_STORE_ID` variable before deployment.

### Accessing via CLI

```bash
# 1. List stores to find the STORE_ID
pnpm wrangler secrets-store store list --remote

# 2. List secrets in the store to find the SECRET_ID
pnpm wrangler secrets-store secret list <STORE_ID> --remote

# 3. Retrieve a secret value
pnpm wrangler secrets-store secret get <STORE_ID> --secret-id <SECRET_ID> --remote
```

## Part G: Monitoring and Analytics

### Custom Hostname Status Monitoring

Monitor SSL certificate provisioning status:

```bash
# Check custom hostname status via API
curl -X GET \
  "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames/{hostname_id}" \
  -H "Authorization: Bearer {api_token}"

# Response includes SSL status:
# - pending: Certificate provisioning in progress
# - active: Certificate issued and active
# - failed: Certificate provisioning failed
```

### Analytics

Monitor in Cloudflare Dashboard:

- Analytics → Traffic (overall platform traffic)
- Analytics → Web Analytics (per-page performance)
- Security → Events (WAF blocks, rate limits)

## Troubleshooting

### Common Issues

1. **SSL Certificate Not Provisioning**
   - Verify DNS CNAME is correctly configured
   - Check custom hostname status via API
   - Wait up to 24 hours for certificate issuance
   - Verify fallback origin is accessible

2. **Custom Domain Not Routing**
   - Verify CNAME record at merchant's DNS
   - Check custom hostname is active in Cloudflare
   - Verify storefront routing logic handles the domain

3. **Storefront Not Resolving Tenant**
   - Check hostname extraction logic
   - Verify tenant exists in Control Plane database
   - Check tenant instance is running and accessible

4. **Rate Limiting Too Aggressive**
   - Adjust rate limiting rules in Security settings
   - Consider per-tenant rate limits vs global limits

### Diagnostic Commands

```bash
# Check DNS resolution
dig shop.merchant.com
nslookup shop.merchant.com

# Test SSL certificate
openssl s_client -connect shop.merchant.com:443 -servername shop.merchant.com

# Check Cloudflare API connectivity
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer {api_token}"

# List all custom hostnames
curl -X GET \
  "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames" \
  -H "Authorization: Bearer {api_token}"
```

## Cost Considerations

### Free Tier

- Cloudflare Pages: Free (with limits)
- Custom Hostnames: 100 free per month
- SSL Certificates: Free (unlimited)
- Basic WAF: Free

### Paid Plans

Consider upgrading for:

- More custom hostnames (1000+)
- Advanced WAF rules
- Super Bot Fight Mode
- Enhanced analytics
- Workers (for advanced routing)

## Integration with Control Plane

The Control Plane should implement these API calls when provisioning tenants:

```typescript
// Example: Adding custom hostname during tenant provisioning
async function addCustomHostname(tenantId: string, domain: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_hostnames`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: "http",
          type: "dv",
        },
      }),
    },
  );

  // Poll for SSL status
  await waitForSSLProvisioning(hostnameId);
}
```

## Next Steps

1. Deploy marketing app to Cloudflare Pages (root domain)
2. Deploy storefront router to Cloudflare Pages (tenant domains)
3. Configure Cloudflare for SaaS
4. Test custom hostname addition via API
5. Implement tenant resolution in storefront router
6. Set up monitoring and alerts
7. Document merchant DNS setup process

## References

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare API Reference](https://developers.cloudflare.com/api/)
- [Custom Hostnames API](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-list-custom-hostnames)
