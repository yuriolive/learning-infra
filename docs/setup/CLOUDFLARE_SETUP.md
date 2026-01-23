# Cloudflare Setup for Multi-Tenant SaaS

- [Cloudflare Setup for Multi-Tenant SaaS](#cloudflare-setup-for-multi-tenant-saas)
  - [Overview](#overview)
  - [Subdomain Structure](#subdomain-structure)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Part A: Storefront Deployment (Cloudflare Pages)](#part-a-storefront-deployment-cloudflare-pages)
    - [Step 1: Prepare Storefront for Deployment](#step-1-prepare-storefront-for-deployment)
    - [Step 2: Deploy to Cloudflare](#step-2-deploy-to-cloudflare)
    - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
    - [Step 4: Set Up Custom Domain for Storefront](#step-4-set-up-custom-domain-for-storefront)
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
    - [Architecture Decision: Hyphens vs. Dots](#architecture-decision-hyphens-vs-dots)
    - [Future Roadmap: Switching to Dotted Subdomains](#future-roadmap-switching-to-dotted-subdomains)
    - [Storefront Routing Logic](#storefront-routing-logic)
  - [Part E: Security Configuration](#part-e-security-configuration)
    - [WAF (Web Application Firewall)](#waf-web-application-firewall)
    - [Rate Limiting](#rate-limiting)
    - [Bot Management](#bot-management)
  - [Part F: Monitoring and Analytics](#part-f-monitoring-and-analytics)
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

1. **Storefront Deployment** (Cloudflare Pages) - Customer-facing Next.js application
2. **Cloudflare for SaaS** - Custom domain management per tenant
3. **DNS and SSL Automation** - Automatic SSL provisioning for merchant domains
4. **SSL/TLS Encryption Mode** - Global encryption settings for the platform

## Subdomain Structure

Based on Shopify pattern (`.myshopify.com`), here's the subdomain structure:

```
vendin.store                    → Landing page & Signup (root domain)
www.vendin.store                → Redirects to root or alternative storefront
control.vendin.store            → Control Plane API
admin.vendin.store              → Platform admin dashboard (optional)
*-my.vendin.store               → Tenant stores (wildcard/hyphenated)
  ├─ awesome-store-my.vendin.store → Merchant storefront
  └─ awesome-store-my.vendin.store/admin → Merchant admin (MedusaJS)
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
         │ merchant-name-my.vendin.store (store) OR
         │ shop.merchant.com (custom domain)
         ▼
┌─────────────────┐
│ Cloudflare      │  (DNS + SSL + CDN)
│ for SaaS        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storefront      │  (Cloudflare Pages - Next.js)
│ (Routes by      │  - Root: Landing/signup page
│  hostname)      │  - Tenant subdomain: Resolves tenant
│                 │  - Custom domain: Resolves tenant
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

## Part A: Storefront Deployment (Cloudflare Pages)

### Step 1: Prepare Storefront for Deployment

The storefront uses **OpenNext** with the Cloudflare adapter for optimal performance:

```bash
# The storefront is pre-configured with:
# - @opennextjs/cloudflare (replaces deprecated @cloudflare/next-on-pages)
# - wrangler.jsonc (Cloudflare Workers configuration)
# - open-next.config.ts (OpenNext configuration)
```

### Step 2: Deploy to Cloudflare

**Option 1: Via Wrangler CLI (Recommended)**

```bash
# Navigate to storefront directory
cd apps/storefront

# Build and deploy in one command
bun run pages:deploy

# Or build first, then deploy
bun run pages:build
bun run pages:deploy

# This uses OpenNext to:
# 1. Build Next.js with Turbopack
# 2. Generate Cloudflare Worker (.open-next/worker.js)
# 3. Deploy to Cloudflare Workers
```

**Option 2: Via GitHub Actions (Automated)**

The repository includes a GitHub Actions workflow that automatically deploys on push to `main`:

```yaml
# .github/workflows/deploy-storefront.yml
# Triggers on:
# - Push to main branch
# - Changes to apps/storefront/** or packages/**
# - Manual workflow dispatch

# Required GitHub Secrets:
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ACCOUNT_ID
```

**First-time setup:**

```bash
# Install Wrangler globally (optional, for local testing)
bun add -g wrangler

# Login to Cloudflare
wrangler login

# The first deployment will create the project automatically
bun run pages:deploy
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

### Step 4: Set Up Custom Domain for Storefront

After deployment, configure custom domains:

```bash
# Option 1: Via Cloudflare Dashboard
# 1. Go to Workers & Pages → storefront → Settings → Domains
# 2. Add custom domain: vendin.store
# 3. Add www.vendin.store (optional)
# 4. Cloudflare will automatically provision SSL

# Option 2: Via Wrangler
wrangler pages deployment tail
```

**Root domain (vendin.store) serves:**

- Landing page
- Signup page
- Marketing content
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
# 2. Create API Token with these Zone-level permissions:
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
# - any-merchant-my.vendin.store
# But NOT reserved subdomains (api, admin, www) which should have explicit records
# The -my prefix provides clear separation from platform services and works with Free SSL
```

### Architecture Decision: Hyphens vs. Dots

Our default tenant subdomains use the hyphenated pattern `{store}-my.vendin.store` instead of the dotted pattern `{store}.my.vendin.store`.

**Why Hyphens? (SSL Coverage)**
Cloudflare's **Universal SSL** (Free/Pro) only issues certificates for:

1.  `vendin.store` (The apex domain)
2.  `*.vendin.store` (First-level wildcards)

A dot separator like `store.my.vendin.store` is a **second-level** subdomain. Cloudflare will not issue a free certificate for it, resulting in a "Hostname is not covered by a certificate" warning and broken HTTPS for users.

By using a hyphen (`store-my.vendin.store`), the hostname remains at the first level, ensuring full, automatic, and free SSL coverage for all tenants.

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
# Root domain (landing/signup)
Type: A or CNAME
Name: @
Target: storefront.pages.dev
Proxy status: Proxied

# Control Plane API
Type: CNAME
Name: control
Target: 1.1.1.1 (or any IP, will be intercepted by Worker)
Proxy status: Proxied (orange cloud)

#### Setting up the Worker Proxy (Free Plan)
Google Cloud Run requires the `Host` header to match the internal service URL. On Free/Pro plans, Origin Rules cannot rewrite the Host header. Use a **Cloudflare Worker**:

1. **Create**: Go to **Workers & Pages** > **Create application** > **Create Worker** named `control-plane-proxy`.
2. **Code**: Replace code with the proxy script (rewriting `url.hostname` and `Host` header).
3. **Route**: Under the domain settings, add a Worker Route for `control.vendin.store/*`.

# Platform Admin (optional)
Type: CNAME
Name: admin
Target: storefront.pages.dev
Proxy status: Proxied
```

### Storefront Routing Logic

Your Next.js storefront should handle different hostname patterns:

```typescript
// Example: apps/storefront/src/middleware.ts
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Root domain: Landing page and signup
  if (hostname === "vendin.store" || hostname === "www.vendin.store") {
    // Serve landing page, signup form, marketing content
    return NextResponse.next();
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
    // Unknown hostname, redirect to landing page
    return NextResponse.redirect("https://vendin.store");
  }

  // Route to tenant instance
  const tenantUrl = `https://tenant-${tenantId}-xxx.a.run.app`;
  // ... route request to tenant
}
```

**Hostname Resolution Logic:**

```typescript
async function resolveTenantFromHostname(
  hostname: string,
): Promise<string | null> {
  // Check if it's a tenant subdomain pattern: {store}-my.vendin.store
  if (hostname.endsWith("-my.vendin.store")) {
    // Extract store name (e.g., "awesome-store" from "awesome-store-my.vendin.store")
    const storeName = hostname.replace("-my.vendin.store", "");

    // Query Control Plane to find tenant by subdomain
    const tenant = await controlPlaneClient.findTenantBySubdomain(storeName);
    return tenant?.id || null;
  }

  // Check if it's a custom domain
  // Query Control Plane to find tenant by custom domain
  const tenant = await controlPlaneClient.findTenantByCustomDomain(hostname);
  return tenant?.id || null;
}
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

## Part F: Monitoring and Analytics

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

1. Deploy storefront to Cloudflare Pages
2. Configure Cloudflare for SaaS
3. Test custom hostname addition via API
4. Implement tenant resolution in storefront
5. Set up monitoring and alerts
6. Document merchant DNS setup process

## References

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare API Reference](https://developers.cloudflare.com/api/)
- [Custom Hostnames API](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-list-custom-hostnames)
