---
description: Patterns and standards for developing private MedusaJS plugins in the monorepo.
globs: packages/medusa/plugins/medusa-plugin-*/**/*
---

# MedusaJS Plugin Development

Standards for creating and maintaining private plugins within the `packages/medusa/plugins/` directory.

## Core Principles

- **Location**: Use `packages/medusa/plugins/medusa-plugin-{name}`.
- **Isolation**: Each plugin should be self-contained but can depend on `@vendin/utils` and `@vendin/config`.
- **DRY**: Do not duplicate core business logic; move shared logic to `@vendin/utils`.

## Structural Requirements

### package.json Exports

Plugins MUST define explicit exports for Medusa's loader to function correctly.

```json
{
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

## Implementation Patterns

For detailed implementation guidance, use the **create-medusa-plugin** skill:

```
View the skill: .agent/skills/shared/create-medusa-plugin/SKILL.md
```

The skill provides comprehensive guidance on:
- Plugin structure and organization
- Module services with dependency injection
- MikroORM entities and repositories
- Admin and Store API routes
- Workflow orchestration patterns
- OAuth integration
- Testing strategies

**Quick reference:**
- **Modules**: Place custom business logic in `src/modules/`
- **Workflows**: Use Medusa workflows for orchestrations in `src/workflows/`
- **API**: Custom routes in `src/api/admin/` or `src/api/store/`
- **Models**: MikroORM entities in `src/models/`

## References

- **Skill**: [create-medusa-plugin](../../skills/shared/create-medusa-plugin/SKILL.md) - Complete plugin creation guide
- **Templates**: [TEMPLATE.md](../../skills/shared/create-medusa-plugin/TEMPLATE.md) - Code templates and examples
- **Example**: [medusa-plugin-bling](../../../packages/medusa-plugin-bling) - Reference implementation
- **Architecture**: [AGENTS.md](../../../AGENTS.md) - Project architecture overview
