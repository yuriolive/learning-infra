# Cursor Rules Organization

This directory contains Cursor AI rules that guide development practices for the Vendin multi-tenant e-commerce platform.

## Directory Structure

```
.agent/rules/
├── apps/                       # Application-specific rules
│   ├── control-plane/          # Control Plane (orchestrator) rules
│   │   ├── provisioning.md   # Tenant provisioning patterns
│   │   ├── api-development.md # Control Plane REST API patterns
│   │   └── domain-structure.md # Domain-driven design patterns
│   ├── storefront/            # Storefront application rules (future)
│   │   ├── routing.md        # Hostname-based tenant routing
│   │   └── frontend-development.md # Next.js patterns
│   └── tenant-instance/       # Tenant instance rules (future)
│       └── medusajs.md       # MedusaJS 2.0 patterns
├── infrastructure/            # Infrastructure-specific rules
│   ├── cloud-run.md         # Google Cloud Run deployment patterns
│   ├── cloudflare.md         # Cloudflare for SaaS patterns
│   ├── database.md          # Neon database provisioning patterns
│   └── secrets.md           # GCP Secret Manager patterns
├── packages/                  # Package-specific rules
│   ├── config-package.md    # Config package patterns
│   ├── medusa-plugins.md    # MedusaJS plugin development patterns
│   └── utils-package.md     # Utils package patterns
└── shared/                   # Rules applicable to all parts of the project
    ├── git/                  # Version control rules
    │   ├── git-conventions.md # Conventional commits
    │   └── github-automation.md # GitHub project automation
    ├── project/              # Project-wide rules
    │   └── project-overview.md # Overview, tech stack, subdomain structure
    ├── quality/              # Code quality rules
    │   └── coding-standards.md # Coding standards and guidelines
    ├── references.md        # Common patterns and naming conventions
    └── testing/              # Testing rules
        └── testing-strategy.md # Testing patterns and strategies
```

## Project Overview

For subdomain structure, service roles, technology stack, and core principles, see [@project-overview.md](shared/project/project-overview.md).

## Code Examples

Code examples are maintained separately in `docs/examples/` to keep rules concise. See [docs/examples/README.md](../../docs/examples/README.md) for available examples.

## Usage

Cursor AI will automatically apply these rules based on the file paths and content it encounters. The rules are organized hierarchically:

1. **Shared rules** apply to all files in the project
2. **App rules** apply specifically when working on application code (apps/control-plane/, apps/storefront/, etc.)
3. **Infrastructure rules** apply when working on infrastructure code or configuration
4. **Package rules** apply when working on shared packages (packages/\*)

## Adding New Rules

When adding new rules:

1. **Determine scope**: Is this rule app-specific, infrastructure-specific, package-specific, or shared?
2. **Choose appropriate folder**: Place in apps/, infrastructure/, packages/, or shared/
3. **Use consistent naming**: Follow the .md extension and descriptive naming
4. **Set glob patterns**: Use appropriate glob patterns in frontmatter for scoping
5. **Reference other rules**: Use "References" section (DRY principles)
6. **Extract examples**: Place code examples in `docs/examples/` and reference them
7. **Update this README**: Document new rules in this README

## Rule Priority

When rules conflict:

1. **Specific beats general**: App-specific rules override shared rules for app files
2. **Newer beats older**: More recently updated rules take precedence
3. **Explicit beats implicit**: Explicitly defined rules beat inferred patterns

## Maintenance

- Review and update rules quarterly or when development patterns change
- Remove outdated rules that no longer apply
- Add new rules for emerging patterns and technologies
- Ensure all cross-references remain valid when reorganizing
- Keep rules concise by extracting examples to `docs/examples/`

## References

- **Architecture**: See [AGENTS.md](../../AGENTS.md) for detailed architecture
- **Project overview**: See [@project-overview.md](shared/project/project-overview.md)
- **Requirements**: See [PRD.md](../../PRD.md) for project requirements
- **Setup Guides**: See [docs/setup/](../../docs/setup/) for infrastructure setup documentation
- **Code examples**: See [docs/examples/](../../docs/examples/)
