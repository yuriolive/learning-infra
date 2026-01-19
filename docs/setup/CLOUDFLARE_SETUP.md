# Cloudflare Setup for Learning Infrastructure

## Overview

This document provides step-by-step instructions for configuring Cloudflare to work with your Google Cloud Run deployments, including DNS management, CDN, and security features.

## Prerequisites

- Cloudflare account
- Domain registered and accessible
- Cloud Run service deployed and accessible
- Basic understanding of DNS and CDN concepts

## Step 1: Add Domain to Cloudflare

```bash
# This is done through the Cloudflare dashboard
# 1. Go to https://dash.cloudflare.com
# 2. Click "Add a Site"
# 3. Enter your domain (e.g., vendin.store)
# 4. Choose your plan (Free is fine for starters)
# 5. Update your domain's nameservers at your registrar
```

## Step 2: Configure DNS Records

### Point Domain to Cloud Run

After adding your domain to Cloudflare, configure DNS:

```bash
# These are configured in Cloudflare DNS settings
# Go to: Domain → DNS → Records

# For API subdomain (Cloud Run)
Type: CNAME
Name: api
Target: ghs.googlehosted.com
TTL: Auto
Proxy status: DNS only (gray cloud)

# For main domain (if using website)
Type: CNAME
Name: @
Target: ghs.googlehosted.com
TTL: Auto
Proxy status: DNS only (gray cloud)
```

### Alternative: Direct CNAME to Cloud Run

```bash
# If you want to use Cloudflare's CDN and features
Type: CNAME
Name: api
Target: [your-cloud-run-url].a.run.app
TTL: Auto
Proxy status: Proxied (orange cloud)
```

## Step 3: Configure Cloud Run Domain Mapping

```bash
# Map your custom domain to Cloud Run service
gcloud run domain-mappings create \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane \
  --domain=api.vendin.store

# Verify the mapping
gcloud run domain-mappings describe \
  --project=vendin-store \
  --region=southamerica-east1 \
  --domain=api.vendin.store
```

## Step 4: Set Up SSL/TLS

### Cloudflare SSL Configuration

```bash
# In Cloudflare dashboard:
# SSL/TLS → Overview
# Set SSL/TLS encryption mode to: Full (strict)

# Edge Certificates:
# - Always Use HTTPS: On
# - Automatic HTTPS Rewrites: On
# - Opportunistic Encryption: On
```

### Cloud Run SSL Certificate

Cloud Run automatically provisions SSL certificates for custom domains. No additional configuration needed.

## Step 5: Configure Security Features

### WAF (Web Application Firewall)

```bash
# In Cloudflare dashboard:
# Security → WAF
# Enable: OWASP Core Ruleset
# Enable: Cloudflare Specials
# Enable: Cloudflare Managed Ruleset
```

### Rate Limiting

```bash
# Security → Rate limiting
# Create new rule:
# - URL Pattern: *api.vendin.store*
# - Request Threshold: 100 requests per minute
# - Action: Block
# - Duration: 60 seconds
```

### Bot Management

```bash
# Security → Bots
# Enable: Bot Fight Mode
# Enable: Super Bot Fight Mode (if on paid plan)
```

## Step 6: Set Up CDN and Caching

### Page Rules for API

```bash
# Rules → Page Rules
# Create rule for API:
# URL: api.vendin.store/*
# Setting: Cache Level - Bypass
# Setting: Disable Security (optional for API)
```

### Browser Cache Settings

```bash
# Caching → Browser Cache TTL
# Respect Existing Headers: On
# Default: 4 hours
```

## Step 7: Configure Origin Rules (For API)

```bash
# Rules → Origin Rules
# Create rule:
# Rule name: API Origin
# When incoming requests match: Hostname equals api.vendin.store
# Then:
# - Set Origin: [your-cloud-run-url].a.run.app
# - Override Hostname: On
# - Hostname: [your-cloud-run-url].a.run.app
```

## Step 8: Set Up Monitoring and Analytics

### Real User Monitoring (RUM)

```bash
# Analytics & Logs → Web Analytics
# Enable: Web Analytics
# Copy the tracking code for your website (if applicable)
```

### Load Balancing (Optional)

If you need to set up load balancing across multiple regions:

```bash
# Traffic → Load Balancing
# Create load balancer
# Add pools for different Cloud Run regions
# Configure health checks
```

## Step 9: Configure Environment-Specific Domains

```bash
# DNS Records for different environments
Type: CNAME
Name: staging-api
Target: ghs.googlehosted.com
TTL: Auto

Type: CNAME
Name: dev-api
Target: ghs.googlehosted.com
TTL: Auto
```

## Cloud Run Domain Mappings for Environments

```bash
# Staging environment
gcloud run domain-mappings create \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane-staging \
  --domain=staging-api.vendin.store

# Development environment
gcloud run domain-mappings create \
  --project=vendin-store \
  --region=southamerica-east1 \
  --service=control-plane-dev \
  --domain=dev-api.vendin.store
```

## Step 10: Set Up Workers (Optional)

If you need edge computing or API transformations:

```javascript
// Example Cloudflare Worker for API routing
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Route API calls
  if (url.pathname.startsWith("/api/")) {
    return fetch(
      `https://api.vendin.store${url.pathname}${url.search}`,
      request,
    );
  }

  // Handle other routes
  return fetch(request);
}
```

## Security Best Practices

### API Security Headers

Configure Transform Rules to add security headers:

```bash
# Rules → Transform Rules → HTTP Response Header Modification
# Create rule:
# When: Hostname equals api.vendin.store
# Then add headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Referrer-Policy: strict-origin-when-cross-origin
```

### CORS Configuration

```bash
# If your API needs CORS headers, configure in Transform Rules
# Or handle in your application code
```

## Monitoring and Troubleshooting

### Check DNS Propagation

```bash
# Check if DNS is pointing correctly
dig api.vendin.store
nslookup api.vendin.store
```

### Cloudflare Analytics

Monitor in Cloudflare dashboard:

- Analytics → Traffic
- Security → Events
- Firewall → Events

### Common Issues

1. **SSL Errors**: Wait for certificate provisioning (can take up to 24 hours)
2. **DNS Not Propagating**: Check nameserver updates at registrar
3. **CORS Issues**: Configure CORS headers in your application
4. **Rate Limiting**: Adjust rate limiting rules based on your needs

## Cost Optimization

### Free Tier Usage

- DNS management: Free
- Basic security: Free
- CDN for static assets: Free
- Rate limiting: 10,000 requests/month free

### Paid Features

Consider upgrading for:

- Advanced WAF rules
- Higher rate limits
- Workers functions
- Advanced analytics

## Cleanup Commands

### Remove Domain from Cloudflare

```bash
# This is done through Cloudflare dashboard
# Domain → Overview → Remove site
# Note: This will delete all configurations
```

### Remove Cloud Run Domain Mappings

```bash
gcloud run domain-mappings delete \
  --project=vendin-store \
  --region=southamerica-east1 \
  --domain=api.vendin.store
```

## Integration with GitHub Actions

You can automate Cloudflare deployments using:

```yaml
# In your workflow
- name: Purge Cloudflare Cache
  uses: jakejarvis/cloudflare-purge-action@v0.3.0
  env:
    CLOUDFLARE_ZONE: ${{ secrets.CLOUDFLARE_ZONE_ID }}
    CLOUDFLARE_TOKEN: ${{ secrets.CLOUDFLARE_TOKEN }}
```

## Next Steps

1. Test your domain configuration
2. Set up monitoring alerts
3. Configure backup and failover if needed
4. Consider setting up Cloudflare Access for internal tools
