# AI Agent Commerce Platform

**Last Updated**: 2026-02-15  
**Status**: Planning  
**Components**: `packages/medusa/plugins/ai/`, `apps/control-plane/`, `apps/marketing/`, `apps/storefront/`

## Overview

Vendin is an **Agentic AI E-commerce Platform** where natural language drives all interactions. Store owners manage their businesses and customers shop through conversational AI interfaces.

## Touchpoints

### Customers

| Channel                    | Description                         | Routing                         |
| -------------------------- | ----------------------------------- | ------------------------------- |
| **Storefront Chat Widget** | Floating chat on store website      | Direct API to tenant instance   |
| **Store WhatsApp**         | Message the store's WhatsApp number | Control Plane → Tenant Instance |

### Store Owners

| Channel             | Description                           | Routing                               |
| ------------------- | ------------------------------------- | ------------------------------------- |
| **Dashboard Chat**  | Chat interface in Marketing App admin | Control Plane Proxy → Tenant Instance |
| **Vendin WhatsApp** | Single number for all store owners    | Control Plane routes by sender phone  |

## Quick Start

```typescript
// Customer sends message via Storefront
const response = await fetch("/api/agent/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Show me red shoes under $50" }),
});

// Store owner manages via Dashboard
const response = await fetch("/api/admin/agent/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Add 100 units to product SKU-123" }),
});
```

## Documentation Index

| Document                                             | Purpose                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                 | System design and component interactions     |
| [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md) | WhatsApp routing, provisioning, and webhooks |
| [TOOLS_REFERENCE.md](./TOOLS_REFERENCE.md)           | Complete tool specifications                 |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)   | Phased implementation guide                  |
| [API_REFERENCE.md](./API_REFERENCE.md)               | REST API endpoints                           |

## Related

- [Architecture Overview](../architecture/README.md)
- [AGENTS.md](../../AGENTS.md)
