# Medusify Storefront

A multi-tenant e-commerce storefront built with Next.js, HeroUI, and Tailwind CSS. This application connects to the Medusify Control Plane to serve tenant-specific store data dynamically based on the hostname.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [HeroUI](https://heroui.com/) (formerly NextUI)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Deployment**: Cloudflare Workers via [OpenNext](https://opennext.js.org/)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [pnpm](https://pnpm.io/) (Package manager)

### Installation

Install dependencies from the root of the monorepo:

```bash
pnpm install
```

### Environment Setup

1.  Copy the example environment file:

    ```bash
    cp .dev.vars.example .dev.vars
    ```

2.  Update `.dev.vars` with your local or development configuration:
    - `CONTROL_PLANE_API_URL`: URL of your running Control Plane (e.g., `http://localhost:3001` or `https://control.vendin.store`).
    - `ADMIN_API_KEY`: A valid API key for the Control Plane.
    - `MARKETING_APP_URL`: URL to redirect to if no tenant is found (e.g., `http://localhost:3000` or `https://vendin.store`).

### Running Locally

You have two options for running the storefront locally:

#### 1. Standard Next.js Dev Server (Recommended for UI Development)

Useful for rapid UI development with Hot Module Replacement (HMR).

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

#### 2. Cloudflare Workers Preview (Recommended for Platform Testing)

Simulates the Cloudflare Workers environment. Use this to verify platform-specific logic like headers, KV bindings, and edge middleware.

```bash
pnpm pages:preview
```

## 📦 Deployment

The application is configured to deploy to Cloudflare Workers.

```bash
# Build the application for Cloudflare
pnpm pages:build

# Deploy to Cloudflare Workers
pnpm pages:deploy
```

## 🔧 Configuration

The Storefront relies on the following environment variables:

| Variable                | Description                                           | Default                        |
| :---------------------- | :---------------------------------------------------- | :----------------------------- |
| `CONTROL_PLANE_API_URL` | URL of the Control Plane API.                         | `https://control.vendin.store` |
| `ADMIN_API_KEY`         | Secret key for authenticating with the Control Plane. | **Required**                   |
| `MARKETING_APP_URL`     | Redirect URL for invalid tenants.                     | `https://vendin.store`         |
