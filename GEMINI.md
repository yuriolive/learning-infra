# Medusify - Multi-Tenant E-commerce Platform

This repository uses [Gemini CLI](https://github.com/google-github-actions/run-gemini-cli) for automated code reviews, issue triage, and AI-assisted development.

## 📖 Core Documentation

For detailed architecture, core principles, and agent guidelines, please refer to:

👉 **[AGENTS.md](./AGENTS.md)**

## 🚀 Key Context for Gemini

- **Multi-Instance Model**: Physical database isolation per tenant (Neon PostgreSQL).
- **Serverless-First**: Scale-to-zero compute (Cloud Run) and serverless infra.
- **TypeScript Only**: Strict mode backend development.
- **Documentation**: Use `context7` MCP for MedusaJS 2.0, Neon, GCP, and Cloudflare.

## ⚠️ Rules

1. NEVER RUN COMMANDS IN WATCH MODE!
2. FILE NAMES SHOULD BE ALWAYS IN KEBAB CASE AND IN ENGLISH!
3. USE ALWAYS POWERSHELL COMMANDS NOT BASH!
4. AVOID USING eslint-disable
5. FAVOR unknown INSTEAD OF any
6. MAKE SURE lint AND typecheck PASSES!
7. NEVER USE any DIRECTLY IF IS POSSIBLE TO USE CORRECT TYPES OR USE unknown INSTEAD.
8. Please use github MCP to comment and mark as resolved when you solve an issue in the PR
