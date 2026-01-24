# Documentation

This directory contains organized documentation for the Learning Infrastructure project.

## Structure

```
docs/
├── deployment/          # CD/CI and deployment guides
│   ├── README.md
│   └── CONTROL_PLANE.md
│
├── setup/              # Infrastructure setup guides
│
├── medusa/            # MedusaJS 2.0 guides
│   ├── README.md
│   └── PRIVATE_PLUGINS.md
│
└── test/               # Testing strategy and architecture
    ├── README.md
    ├── CURRENT_STATE.md
    └── PLANNED_IMPROVEMENTS.md
```

## Quick Links

### Deployment

- [Control Plane CD Pipeline](./deployment/CONTROL_PLANE.md) - Cloud Run deployment guide

### Testing

- [Test Architecture Overview](./test/README.md) - Testing strategy and commands
- [Current Test Implementation](./test/CURRENT_STATE.md) - PGLite setup and patterns
- [Planned Test Improvements](./test/PLANNED_IMPROVEMENTS.md) - Future refactoring plans

### MedusaJS

- [Private Plugin Development](./medusa/PRIVATE_PLUGINS.md) - Guide for creating and linking plugins

### Setup

- [Setup Guides](./setup/) - Infrastructure provisioning documentation

## Documentation Standards

### Naming Conventions

- **Directories**: lowercase-with-hyphens (`test/`, `deployment/`)
- **README files**: `README.md` in each directory
- **State files**: `CURRENT_STATE.md`, `PLANNED_IMPROVEMENTS.md`
- **Component files**: `UPPERCASE_WITH_UNDERSCORES.md` (e.g., `CONTROL_PLANE.md`)

### Organization Rules

1. Never create standalone docs in `docs/` root (use subdirectories)
2. Always create `README.md` with quick reference in each subdirectory
3. Use UPPERCASE_WITH_UNDERSCORES for component-specific docs
4. Keep docs DRY - reference detailed content, don't duplicate
5. Include "Related Documentation" section with links

### File Templates

#### Topic README.md

```markdown
# {Topic} Documentation

Brief description of what this directory contains.

## Documents

### [FILE_NAME.md](./FILE_NAME.md)

Brief description of file contents.

## Quick Reference

Key commands, links, or information here.

## Related Documentation

Links to related docs.
```

#### Component Documentation

```markdown
# {Component Name}

**Last Updated**: YYYY-MM-DD
**Status**: ✅ Status
**Component**: `path/to/component`

## Overview

Brief description and key points.

## Sections

Detailed content organized by topic.

## Related Documentation

Links to related documentation.
```

## Contributing

When adding new documentation:

1. Create appropriate subdirectory in `docs/` if needed
2. Add `README.md` to the subdirectory
3. Use proper naming conventions
4. Update this root `README.md` with links
5. Add cross-references in related docs
