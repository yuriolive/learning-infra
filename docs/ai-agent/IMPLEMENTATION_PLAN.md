# Implementation Plan

**Last Updated**: 2026-02-16

## Overview

This document outlines the phased implementation of the AI Agent Commerce Platform.

## Phase 1: Foundation

**Duration**: Week 1-2  
**Goal**: Core infrastructure for AI agent integration

### 1.1 Extend AI Agent Module

**Location**: `packages/medusa/plugins/ai/agent/`

#### Tasks

- [ ] Add `role` parameter to `processMessage()`
- [ ] Create role-based tool filtering
- [ ] Implement admin system prompt
- [ ] Create `getAdminTools()` function skeleton

#### Files to Modify/Create

```
packages/medusa/plugins/ai/agent/src/
├── service.ts                    # Add role parameter
├── graph/
│   ├── index.ts                 # Role-based graph creation
│   └── prompts/
│       ├── customer.ts          # NEW: Customer system prompt
│       └── admin.ts             # NEW: Admin system prompt
└── tools/
    ├── index.ts                 # NEW: Tool registry
    └── admin/
        └── index.ts             # NEW: Admin tools skeleton
```

#### Code Changes

```typescript
// service.ts
async processMessage(
  threadId: string,
  text: string,
  context: { role: "admin" | "customer"; tenantId: string }
): Promise<string> {
  const tools = getToolsForRole(this.container, context.role);
  const graph = await createAgentGraph(this.container, {
    tools,
    role: context.role,
  });
  // ...
}
```

---

### 1.2 Control Plane Webhook Handler

**Location**: `apps/control-plane/src/domains/webhooks/`

#### Tasks

- [ ] Create `/webhooks/whatsapp` endpoint
- [ ] Implement tenant lookup by phone number
- [ ] Add proxy to tenant instance
- [ ] Implement signature verification

#### Files to Create

```
apps/control-plane/src/domains/webhooks/
├── whatsapp.route.ts            # NEW: Webhook endpoint
├── whatsapp.service.ts          # NEW: Routing logic
├── whatsapp-sender.ts           # NEW: Reply sending
├── signature.ts                 # NEW: Signature verification
└── __tests__/
    ├── whatsapp.route.spec.ts
    └── whatsapp.service.spec.ts
```

---

### 1.3 Database Migrations

**Location**: `apps/control-plane/src/database/`

#### Tasks

- [ ] Add WhatsApp fields to `tenants` table
- [ ] Create `tenantAdmins` table
- [ ] Add phone field to users (Marketing App)

#### Migration

```sql
-- Add WhatsApp fields to tenants
ALTER TABLE tenants ADD COLUMN whatsapp_phone_number TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN whatsapp_phone_id TEXT;
ALTER TABLE tenants ADD COLUMN whatsapp_provider TEXT DEFAULT 'facebook';
ALTER TABLE tenants ADD COLUMN whatsapp_verified_at INTEGER;

-- Create tenant admins table
CREATE TABLE tenant_admins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'owner',
  phone_verified_at INTEGER,
  created_at INTEGER
);

CREATE INDEX tenant_admin_phone_idx ON tenant_admins(phone);
CREATE INDEX tenant_whatsapp_phone_idx ON tenants(whatsapp_phone_number);
```

---

### 1.4 Tenant Instance Webhook Endpoint

**Location**: `apps/tenant-instance/src/api/webhooks/`

#### Tasks

- [ ] Create `/webhooks/whatsapp` route
- [ ] Wire to AgentModuleService

#### Files to Create

```
apps/tenant-instance/src/api/webhooks/whatsapp/
├── route.ts                     # NEW: Webhook handler
└── validators.ts                # NEW: Input validation
```

---

## Phase 2: Admin Tools

**Duration**: Week 3-4  
**Goal**: Enable store management via AI

### 2.1 Product Management Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/admin/`

#### Tasks

- [ ] Implement `list_products`
- [ ] Implement `create_product`
- [ ] Implement `update_product`
- [ ] Implement `delete_product`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/admin/
├── index.ts
├── products.ts                  # Product CRUD tools
└── __tests__/
    └── products.spec.ts
```

---

### 2.2 Inventory Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/admin/`

#### Tasks

- [ ] Implement `get_inventory`
- [ ] Implement `update_inventory`
- [ ] Implement `low_stock_alerts`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/admin/
├── inventory.ts                 # Inventory management tools
└── __tests__/
    └── inventory.spec.ts
```

---

### 2.3 Order Management Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/admin/`

#### Tasks

- [ ] Implement `list_orders`
- [ ] Implement `fulfill_order`
- [ ] Implement `cancel_order`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/admin/
├── orders.ts                    # Order management tools
└── __tests__/
    └── orders.spec.ts
```

---

### 2.4 Analytics Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/admin/`

#### Tasks

- [ ] Implement `sales_summary`
- [ ] Implement `top_products`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/admin/
├── analytics.ts                 # Analytics tools
└── __tests__/
    └── analytics.spec.ts
```

---

## Phase 3: Customer Tools

**Duration**: Week 3-4 (parallel with Phase 2)  
**Goal**: Complete shopping via AI

### 3.1 Extended Cart Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/customer/`

#### Tasks

- [ ] Implement `get_cart`
- [ ] Implement `remove_from_cart`
- [ ] Implement `update_cart_item`

#### Files to Modify

```
packages/medusa/plugins/ai/agent/src/tools/customer/
├── cart.ts                      # Extend existing
└── __tests__/
    └── cart.spec.ts
```

---

### 3.2 Order Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/customer/`

#### Tasks

- [ ] Implement `track_order`
- [ ] Implement `order_history`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/customer/
├── orders.ts                    # NEW
└── __tests__/
    └── orders.spec.ts           # NEW
```

---

### 3.3 Checkout Tools

**Location**: `packages/medusa/plugins/ai/agent/src/tools/customer/`

#### Tasks

- [ ] Implement `initiate_checkout`

#### Files to Create

```
packages/medusa/plugins/ai/agent/src/tools/customer/
├── checkout.ts                  # NEW
└── __tests__/
    └── checkout.spec.ts         # NEW
```

---

## Phase 4: Chat UIs

**Duration**: Week 5-6  
**Goal**: Web-based chat interfaces

### 4.1 Marketing App - Admin Chat

**Location**: `apps/marketing/src/`

#### Tasks

- [ ] Create `AdminChatWidget` component
- [ ] Create `/api/admin/agent/chat` route
- [ ] Integrate with Control Plane proxy
- [ ] Add to dashboard layout

#### Files to Create

```
apps/marketing/src/
├── app/api/admin/agent/
│   └── route.ts                 # NEW: Chat API
├── components/admin/
│   ├── admin-chat-widget.tsx    # NEW: Chat UI
│   ├── chat-message.tsx         # NEW
│   └── chat-input.tsx           # NEW
└── hooks/
    └── use-admin-agent-chat.ts  # NEW: Chat hook
```

---

### 4.2 Storefront - Customer Chat

**Location**: `apps/storefront/src/`

#### Tasks

- [ ] Create `CustomerChatWidget` component
- [ ] Create `/api/agent/chat` route
- [ ] Proxy to tenant instance
- [ ] Add to layout

#### Files to Create

```
apps/storefront/src/
├── app/api/agent/
│   └── route.ts                 # NEW: Chat API
├── components/store/
│   ├── customer-chat-widget.tsx # NEW: Chat UI
│   ├── chat-message.tsx         # NEW
│   └── chat-input.tsx           # NEW
└── hooks/
    └── use-customer-agent-chat.ts # NEW: Chat hook
```

---

## Phase 5: WhatsApp Integration

**Duration**: Week 7-8  
**Goal**: WhatsApp as first-class channel

### 5.1 WhatsApp Number Provisioning

**Location**: `apps/control-plane/src/domains/provisioning/`

#### Tasks

- [ ] Design provisioning flow
- [ ] Integrate with Meta Business API (or Twilio)
- [ ] Add to tenant onboarding

#### Files to Create

```
apps/control-plane/src/domains/provisioning/
├── whatsapp-provisioning.ts     # NEW: Number assignment
└── __tests__/
    └── whatsapp-provisioning.spec.ts
```

---

### 5.2 Admin Phone Registration

**Location**: `apps/marketing/src/app/api/admin/phone/`

#### Tasks

- [ ] Create phone registration flow
- [ ] Implement OTP verification
- [ ] Store in `tenantAdmins` table

#### Files to Create

```
apps/marketing/src/app/api/admin/phone/
├── register/
│   └── route.ts                 # NEW: Register phone
├── verify/
│   └── route.ts                 # NEW: Verify OTP
└── status/
    └── route.ts                 # NEW: Check registration status
```

---

### 5.3 End-to-End Testing

#### Tasks

- [ ] Customer WhatsApp -> Store flow test
- [ ] Admin WhatsApp -> Vendin flow test
- [ ] Conversation memory tests
- [ ] Rate limiting tests

---

## Dependencies

### New Packages Required

```json
{
  "dependencies": {
    "@langchain/core": "^1.1.17",
    "@langchain/google-genai": "^2.1.13",
    "@langchain/langgraph": "^1.1.2",
    "@langchain/langgraph-checkpoint-redis": "^1.0.1"
  }
}
```

### Environment Variables

See [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md#environment-variables)

---

## Testing Strategy

### Unit Tests

- Tool execution in isolation
- Routing logic
- Signature verification

### Integration Tests

- End-to-end message flow
- Conversation memory persistence
- Multi-tenant isolation

### Load Tests

- Concurrent conversations
- Rate limiting behavior

---

## Rollout Plan

### Stage 1: Internal Testing

- Test with Vendin team
- Admin tools only
- Dashboard chat only

### Stage 2: Beta

- Select merchants (5-10)
- Customer tools enabled
- WhatsApp optional

### Stage 3: General Availability

- All merchants
- Full feature set
- WhatsApp provisioning automated

---

## Task Breakdown Summary

| Phase                   | Tasks        | Est. Time     |
| ----------------------- | ------------ | ------------- |
| Phase 1: Foundation     | 15 tasks     | 2 weeks       |
| Phase 2: Admin Tools    | 12 tasks     | 2 weeks       |
| Phase 3: Customer Tools | 6 tasks      | 1 week        |
| Phase 4: Chat UIs       | 8 tasks      | 2 weeks       |
| Phase 5: WhatsApp       | 7 tasks      | 2 weeks       |
| **Total**               | **48 tasks** | **8-9 weeks** |

---

## Milestone Checklist

### Milestone 1: Core Agent (End of Phase 1)

- [ ] Agent processes messages with role context
- [ ] WhatsApp webhooks route to correct tenant
- [ ] Database schema updated
- [ ] Basic tests passing

### Milestone 2: Admin Capable (End of Phase 2)

- [ ] All admin tools implemented
- [ ] Admin can manage products via API
- [ ] Admin can check inventory
- [ ] Admin can fulfill orders

### Milestone 3: Customer Capable (End of Phase 3)

- [ ] All customer tools implemented
- [ ] Customer can search and add to cart
- [ ] Customer can track orders

### Milestone 4: Web Ready (End of Phase 4)

- [ ] Dashboard chat UI live
- [ ] Storefront chat widget live
- [ ] Session persistence working

### Milestone 5: WhatsApp Ready (End of Phase 5)

- [ ] WhatsApp webhooks working
- [ ] Admin phone registration flow
- [ ] Number provisioning automated
- [ ] E2E tests passing
