# Claude Skills for Multi-Tenant E-commerce Platform

This directory contains Claude Skills for the multi-tenant e-commerce platform project. Skills are task-oriented workflows that extend Claude's capabilities for this codebase.

## Implemented Skills

### shared/create-skill

**Location**: `.claude/skills/shared/create-skill/`

Helps create new Claude Skills following official format and learning-infra monorepo structure. Includes templates and validation tools.

**Use when**: Creating new Skills, migrating Cursor commands to Skills, or when asked to create a Skill.

### shared/debug-code

**Location**: `.claude/skills/shared/debug-code/`

Debugs code issues, errors, failing tests, and broken flows using a systematic workflow. Identifies root causes, applies minimal fixes, and validates solutions. Includes tenant isolation and provisioning debugging patterns.

**Use when**: Debugging errors, fixing failing tests, troubleshooting API endpoints, or resolving database issues.

### shared/review-code

**Location**: `.claude/skills/shared/review-code/`

Reviews code against project standards for architecture compliance, code quality, tenant isolation, and test coverage. Reviews for REST API patterns, provisioning workflows, and infrastructure best practices.

**Use when**: Reviewing code locally, reviewing specific files, or when asked to review code.

### shared/create-pull-request

**Location**: `.claude/skills/shared/create-pull-request/`

Creates a GitHub pull request using the project's PR template and standard workflows. Handles branch pushing and PR creation via GitHub CLI.

**Use when**: You have finished a task and are ready to submit changes for review.

### shared/github-project-management

**Location**: `.claude/skills/shared/github-project-management/`

Creates and manages GitHub issues and project items. Works with GitHub Projects v2 via MCP tools.

**Use when**: Creating GitHub issues, adding items to projects, or managing GitHub Project boards.

## Skills Organization

Skills are organized by scope in the monorepo:

- **Control Plane Skills** -> `.claude/skills/control-plane/` - For REST API, tenant provisioning, domain logic
- **Shared Skills** -> `.claude/skills/shared/` - For cross-app functionality
- **Infrastructure Skills** -> `.claude/skills/infrastructure/` - For Cloud Run, Cloudflare, Neon patterns

## Creating New Skills

To create a new Skill:

1. **Use the Create Skill Skill**: Ask Claude to "create a new Skill for [purpose]"
2. **Follow the workflow**: The Skill guides you through determining scope, choosing location, and structuring content.
3. **Reference Rules**: Always reference Cursor rules instead of duplicating their content to maintain DRY principles.

## Usage

Skills are automatically triggered by Claude based on natural language requests. Each Skill's description includes trigger keywords that match user requests.
