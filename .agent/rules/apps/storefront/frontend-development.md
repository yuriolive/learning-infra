---
description: Next.js 15 patterns and Cloudflare Pages deployment for storefront.
globs: apps/storefront/**/*
---
# Storefront Frontend Development

## Framework

- **Framework**: Next.js 15
- **Runtime**: Edge runtime (Cloudflare Pages)
- **Deployment**: Cloudflare Pages
- **Styling**: Tailwind CSS (recommended)
- **UI Components**: HeroUI (Required for new UI components)

## Routing

- Use Next.js App Router
- Implement hostname-based tenant resolution in middleware
- Route to tenant instances for API calls
- Storefront is router-only (no customer UI rendering)

## API Integration

- Use tenant API URL from middleware context
- Proxy requests to tenant instances
- Handle tenant-specific errors gracefully
- Implement retry logic for failed requests

## Performance

- Optimize for edge deployment
- Use Next.js Image component for assets
- Implement proper caching strategies
- Minimize bundle size

## Environment Variables

- `CONTROL_PLANE_API_URL`: `https://control.vendin.store`
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token (for custom domains)

## Deployment

- Deploy to Cloudflare Pages
- Configure build settings in Pages dashboard
- Set up tenant wildcard: `*-my.vendin.store`
- Configure environment variables in Pages

## References

- **Hostname routing**: See [@routing.md](./routing.md)
- **Subdomain structure**: See [@project-overview.md](../../shared/project/project-overview.md)
