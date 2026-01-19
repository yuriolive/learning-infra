# Multi-Tenant E-commerce Platform (Medusify)

A highly scalable, serverless SaaS e-commerce platform built with **MedusaJS 2.0**. This platform uses a **Multi-Instance Provisioning model**, ensuring 100% physical database isolation for every merchant.

## 🚀 Key Features

- **True Tenant Isolation**: Dedicated Neon PostgreSQL database and isolated Google Cloud Run compute per merchant.
- **Serverless-First Architecture**: Scale-to-zero compute (Google Cloud Run), serverless DB (Neon), and serverless cache (Upstash Redis).
- **Rapid Onboarding**: Automated provisioning of a full store instance in less than 2 minutes.
- **Custom Domains**: Seamless custom domain connection with automated SSL via Cloudflare for SaaS.

## 🏗️ Architecture Overview

The platform is split into three primary layers:

1.  **Control Plane (Orchestrator)**: Manages merchant signups, database provisioning, and instance orchestration.
2.  **Tenant Instances**: Isolated MedusaJS 2.0 backends tailored for each merchant.
3.  **Storefront**: A multi-tenant Next.js application that routes traffic based on hostname/subdomain.

For a detailed deep-dive, see [PRD.md](PRD.md).

## 🛠️ Technology Stack

- **Backend**: MedusaJS 2.0 (TypeScript)
- **Frontend**: Next.js on Cloudflare Pages
- **Database**: Neon Serverless PostgreSQL
- **Cache**: Upstash Redis
- **Networking**: Cloudflare for SaaS & Cloudflare R2 (Assets)
- **Compute**: Google Cloud Run

## 🤖 AI-Native Development

This repository is optimized for AI-assisted development with specific rules and skills:

- **Modular Cursor Rules**: Found in [.cursor/rules/](.cursor/rules/), defining standards for infrastructure, backend, and project automation.
- **GitHub Automation**: The `github-automation.mdc` rule ensures that tasks and issues are proactively tracked based on chat context.
- **Custom Claude Skills**: Shared skills for project management are located in [.claude/skills/shared/](.claude/skills/shared/).

## 📖 Documentation

- [PRD.md](PRD.md): Product Requirements Document and Technical Specifications.
- [ROADMAP.md](ROADMAP.md): Development roadmap organized by phases and components.
- [AGENTS.md](AGENTS.md): Architecture and guidelines for AI agents.

---
*Built with speed, security, and scalability in mind.*
