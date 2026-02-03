This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

```bash
# Control Plane Integration
CONTROL_PLANE_API_URL=https://control-plane.vendin.store
CONTROL_PLANE_API_KEY=your_api_key_here

# Development Settings
DEVELOPMENT_TENANT_ID=dev-tenant-uuid
ENABLE_TENANT_CACHE=true
TENANT_CACHE_TTL=300
```

- `CONTROL_PLANE_API_URL`: The URL of the Control Plane API.
- `CONTROL_PLANE_API_KEY`: API Key for authentication with Control Plane.
- `DEVELOPMENT_TENANT_ID`: Fallback Tenant ID for localhost development.

## Middleware

The application uses Next.js Middleware (`src/middleware.ts`) for multi-tenant routing:
- Extracts subdomain from hostname.
- Resolves tenant via Control Plane API.
- Injects tenant context headers (`X-Tenant-Id`, `X-Tenant-Subdomain`, etc.).
- Handles redirects (www -> root) and status pages (Provisioning, Suspended).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
