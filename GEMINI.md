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
