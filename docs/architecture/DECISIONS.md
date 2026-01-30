# Architectural Decisions

This document records significant architectural decisions for the platform, including context, rationale, and consequences.

## 2026-01-28: Adopt Lockstep MVP Architecture

### Context

Scaling "Router + Isolated Frontend" was adding complexity. We needed a way to support tenant-specific integrations (ERPs, Payments) without managing hundreds of UI deployments or codebases.

### Decision

Move to a **Single Shared Storefront** (UI) + **Multi-Instance Backend** (Logic).

- **Frontend**: One Next.js app serving all tenants.
- **Backend**: Isolated Cloud Run instances.
- **Versions**: "Lockstep" policy (everyone on same version).
- **Features**: "Mega-Image" with all plugins installed, toggled via Env Vars.

### Consequences

- **Positive**: Drastically reduced CI/CD complexity. Single UI to maintain.
- **Negative**: Less flexibility for "custom React code" per tenant (must be config-driven).
- **Action**: Deprecate Storefront Router.

## 2026-01-27: Use PNPM Package Manager

### Context

The project initially used [Bun](https://bun.sh/) as the package manager and runtime to leverage its performance benefits and all-in-one tooling. However, as development progressed, we encountered specific limitations and compatibility challenges.

### Decision

We decided to migrate the package manager from **Bun** to **PNPM**.

### Rationale

1.  **Library Compatibility**: We faced critical compatibility issues with key libraries in our stack, specifically **PGlite** and **MedusaJS**. These issues were tracked in [MedusaJS Discussion #5036](https://github.com/medusajs/medusa/discussions/5036) and required a deeper level of Node.js compatibility than Bun currently offers for these specific edge cases.
2.  **Windows Stability**: A significant portion of our development happens on Windows. While Bun has Windows support, **PNPM** provides a more mature and consistent experience across operating systems, particularly for shell interactions and workspace linking.
3.  **Strict Dependency Management**: PNPM's unique node_modules structure (symlinking) prevents "phantom dependencies" (accessing packages not listed in package.json), leading to more reliable builds and fewer "works on my machine" issues.
4.  **Corepack Support**: PNPM is natively supported by Node.js via Corepack, allowing for seamless version management ( `packageManager` field in `package.json`) without external binary installations.

### Consequences

- **Development**: Developers must use `pnpm` CLI commands.
- **CI/CD**: CI pipelines now use `pnpm/action-setup` and `pnpm install`.
- **Runtime**: We continue to target Node.js/V8 compatibility for maximum library support.
