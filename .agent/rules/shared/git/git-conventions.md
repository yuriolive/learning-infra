---
description: Git commit conventions and branching strategies following Conventional Commits specification.
globs: **/*
---
# Git Conventions

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```
feat(control-plane): add tenant provisioning endpoint

Implements POST /api/tenants endpoint with Neon database creation
and Cloud Run service provisioning.

Closes #123
```

```
fix(infrastructure): correct Cloud Run service naming pattern

Tenant services should use tenant-{id} format, not tenant_{id}.
```

## Pre-Commit Verification

**ALWAYS verify changes pass Husky pre-commit hooks before committing.**

After making any code changes, run the following to ensure Husky checks will pass:

```bash
# Run linting (ESLint + Prettier)
pnpm run lint

# Run type checking
pnpm run typecheck

# Or run all checks that Husky will run
pnpm run lint && pnpm run typecheck
```

**Husky Pre-Commit Hooks**:
- ESLint with auto-fix (`pnpm dlx eslint --fix`)
- Prettier formatting (`pnpm dlx prettier --write`)
- TypeScript type checking (`pnpm dlx tsc --noEmit --project tsconfig.ci.json`)

**Why this matters**:
- Prevents failed commits due to linting/formatting errors
- Ensures code quality standards are maintained
- Avoids blocking other developers with failing CI checks
- Saves time by catching issues before commit

**Workflow**:
1. Make code changes
2. Run `pnpm run lint && pnpm run typecheck` locally
3. Fix any errors or warnings
4. Stage and commit changes
5. Husky will run the same checks automatically

## References

- **General coding standards**: See [@coding-standards.md](../quality/coding-standards.md)
