# Private MedusaJS Plugins

**Last Updated**: 2026-01-21
**Status**: ✅ Active
**Component**: `packages/medusa-plugin-*`

## Overview

This document outlines the standard practice for developing and integrating private MedusaJS 2.0 plugins within the Vendin monorepo. Using the monorepo structure ensures that internal logic is shared efficiently, type-safe, and easy to maintain.

## Development Workflow

### 1. Plugin Location

All private plugins must be developed in the `packages/` directory.

> [!TIP]
> Use a consistent naming convention: `packages/medusa-plugin-{name}`.

### 2. Plugin Structure

A Medusa plugin requires specific `package.json` exports to be recognized by the Medusa loader.

```json
{
  "name": "@vendin/medusa-plugin-custom",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./package.json": "./package.json",
    "./workflows": "./dist/workflows/index.js",
    "./modules/*": "./dist/modules/*/index.js",
    "./admin": {
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    },
    "./*": "./dist/*.js"
  }
}
```

See [docs/examples/medusa-plugin-package.json](../examples/medusa-plugin-package.json) for a full example.

### 3. Workspace Linking

To use the plugin in a Medusa application (e.g., `apps/tenant-instance`):

1. Add the plugin as a dependency:

   ```bash
   bun add @vendin/medusa-plugin-custom@workspace:*
   ```

2. Register it in `medusa-config.ts`:
   ```typescript
   module.exports = defineConfig({
     // ...
     plugins: [
       {
         resolve: "@vendin/medusa-plugin-custom",
         options: {},
       },
     ],
   });
   ```

## DRY Guidelines

- **Shared Utils**: Use `@vendin/utils` for general business logic instead of duplicating it in plugins.
- **Shared Config**: Use `@vendin/config` for environment variables and base configurations.
- **Abstract Classes**: If multiple plugins share similar behavior (e.g., payment providers), define an abstract base class in a shared package.

## Vendor Plugins

If you need to internalize a vendor plugin (e.g., from a tarball), place it in a dedicated directory like `vendor/plugins/` (if it exists) or keep it in `packages/` if you intend to modify it.

> [!NOTE]
> If using `npm pack` for external plugins, ensure the tarball is committed or managed via a private registry to maintain reproducibility.

## Related Documentation

- [AGENTS.md](../../AGENTS.md)
- [.cursor/rules/tenant-instance/medusa-plugins.mdc](../../.cursor/rules/tenant-instance/medusa-plugins.mdc)
