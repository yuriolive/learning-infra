---
name: review-code
description: Reviews code against learning-infra project standards for architecture compliance, code quality, tenant isolation, and test coverage. Reviews for REST API patterns, provisioning workflows, and infrastructure best practices. Use when reviewing code locally, reviewing specific files, or when asked to review code.
---

# Review Code

Reviews code against learning-infra project standards for architecture compliance, code quality, tenant isolation, and test coverage.

## Project Documentation References

**Critical**: Reference Cursor rules instead of duplicating their content.

For comprehensive project documentation and compatibility requirements, see:

- **[AGENTS.md](../../../AGENTS.md)** - Central reference for all project documentation
- **[@project-overview.mdc](../../.agent/rules/shared/project/project-overview.mdc)** - Project overview and tech stack
- **[@api-development.mdc](../../.agent/rules/apps/control-plane/api-development.mdc)** - Control Plane REST API patterns
- **[@provisioning.mdc](../../.agent/rules/apps/control-plane/provisioning.mdc)** - Tenant provisioning patterns
- **[@domain-structure.mdc](../../.agent/rules/apps/control-plane/domain-structure.mdc)** - Domain-driven design patterns
- **[@database.mdc](../../.agent/rules/infrastructure/database.mdc)** - Neon database patterns
- **[@cloud-run.mdc](../../.agent/rules/infrastructure/cloud-run.mdc)** - Cloud Run deployment patterns
- **[@testing-strategy.mdc](../../.agent/rules/shared/testing/testing-strategy.mdc)** - Testing patterns and strategies
- **[@coding-standards.mdc](../../.agent/rules/shared/quality/coding-standards.mdc)** - Coding standards and guidelines

## Review Workflow

### Step 1: Context Gathering

1. **Identify Code Scope**:
   - Control Plane, Storefront, or Infrastructure code
   - Single file or multiple files
   - Feature area (e.g., provisioning, domain management)

2. **Check File Location**:
   - `apps/control-plane/**` -> Control Plane context
   - `apps/storefront/**` -> Storefront context
   - `infrastructure/**` -> Infrastructure context
   - `packages/**` -> Package context

### Step 2: Code Review

Review code against project standards. Reference rules, don't duplicate them.

**Review Priorities**:

1. **Tenant Isolation Compliance** (@project-overview.mdc, @coding-standards.mdc)
   - **MANDATORY**: Verify physical database isolation (one database per tenant)
   - Check that connection strings are never shared
   - Ensure tenant scoping in all queries

2. **Control Plane API Patterns** (@api-development.mdc)
   - RESTful style compliance
   - TSDoc requirements met
   - OpenAPI/Scalar UI registration
   - Structured error handling

3. **Provisioning Workflow Compliance** (@provisioning.mdc)
   - Proper orchestration steps
   - **CRITICAL**: Error handling and rollback implementation
   - Provisioning time targets considered

4. **Infrastructure Best Practices** (@cloud-run.mdc, @cloudflare.mdc, @database.mdc)
   - Scale-to-zero configuration
   - Secure secret management (@secrets.mdc)
   - Serverless-first priority

5. **Code Quality and Standards** (@coding-standards.mdc)
   - TypeScript strict usage
   - Pino logger usage (no `console.log`)
   - Function length and complexity

6. **Testing Strategy Compliance** (@testing-strategy.mdc)
   - Unit and integration tests added
   - Tenant isolation tests included
   - Coverage requirements met (80% minimum)

### Step 3: Feedback Generation

1. **Identify Issues**:
   - Critical violations (e.g., tenant isolation)
   - Pattern deviations (e.g., REST style)
   - Quality improvements (e.g., refactoring)

2. **Provide Constructive Feedback**:
   - Be direct and succinct
   - Reference specific rules (@rule-name.mdc)
   - Suggest minimal fixes

## Review Checklist

### Critical Items

- [ ] Physical database isolation maintained?
- [ ] Provisioning rollback implemented?
- [ ] Scale-to-zero configured?
- [ ] Secrets handled securely via Secret Manager?

### API and Logic

- [ ] RESTful patterns followed?
- [ ] TSDoc comments present and valid?
- [ ] OpenAPI schemas registered?
- [ ] Structured logging used (Pino)?

### Quality and Testing

- [ ] Tests added for critical paths?
- [ ] Tenant isolation tested?
- [ ] No `console.log` in source code?
- [ ] Types are strict and accurate?

## Best Practices

1. **DRY Principles**: Reference rules instead of repeating them
2. **Directness**: Be clear and concise in feedback
3. **Context-Aware**: Adapt review based on which part of the project is being changed
4. **Isolation First**: Always verify tenant isolation as the highest priority
