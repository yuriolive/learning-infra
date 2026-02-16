# AI Agent Architecture

**Last Updated**: 2026-02-15

## System Overview

```
+-------------------------------------------------------------------------+
|                           TOUCHPOINTS                                    |
+-------------------------------------------------------------------------+
|                                                                          |
|   CUSTOMERS                          STORE OWNERS                        |
|   +-----------------+               +-----------------+                  |
|   | Storefront Chat |               | Dashboard Chat  |                  |
|   |     Widget      |               |  (Marketing)    |                  |
|   +--------+--------+               +--------+--------+                  |
|            |                                 |                           |
|   +--------+--------+               +--------+--------+                  |
|   | Store WhatsApp  |               | Vendin WhatsApp |                  |
|   |  (per-tenant)   |               |  (single num)   |                  |
|   +--------+--------+               +--------+--------+                  |
|            |                                 |                           |
+------------+---------------------------------+---------------------------+
             |                                 |
             v                                 v
+-------------------------------------------------------------------------+
|                        CONTROL PLANE                                     |
+-------------------------------------------------------------------------+
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  |                  WhatsApp Webhook Handler                          | |
|  |                                                                    | |
|  |  Incoming Webhook                                                  | |
|  |  +-------------------------------------------------------------+  | |
|  |  |  to: destination phone number                               |  | |
|  |  |  from: sender phone number                                  |  | |
|  |  |  message: text content                                      |  | |
|  |  +-------------------------------------------------------------+  | |
|  |                          |                                         | |
|  |                          v                                         | |
|  |  +-------------------------------------------------------------+  | |
|  |  |                   Routing Logic                              |  | |
|  |  |                                                              |  | |
|  |  |  if (to === VENDIN_WHATSAPP_NUMBER) {                        |  | |
|  |  |    // Admin messaging Vendin                                 |  | |
|  |  |    tenantId = lookupTenantByAdminPhone(from)                 |  | |
|  |  |    role = "admin"                                            |  | |
|  |  |  } else {                                                    |  | |
|  |  |    // Customer messaging store                               |  | |
|  |  |    tenantId = lookupTenantByWhatsAppNumber(to)               |  | |
|  |  |    role = "customer"                                         |  | |
|  |  |  }                                                           |  | |
|  |  +-------------------------------------------------------------+  | |
|  |                          |                                         | |
|  |                          v                                         | |
|  |  +-------------------------------------------------------------+  | |
|  |  |          Proxy to Tenant Instance (IAM Auth)                 |  | |
|  |  |                                                              |  | |
|  |  |  POST https://tenant-{id}.a.run.app/webhooks/whatsapp        |  | |
|  |  |  Headers: Authorization: Bearer {iam_token}                   |  | |
|  |  |  Body: { from, message, role, threadId: from }               |  | |
|  |  +-------------------------------------------------------------+  | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
+-------------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------------+
|                       TENANT INSTANCE                                    |
+-------------------------------------------------------------------------+
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  |                    API Routes                                       | |
|  |                                                                    | |
|  |  POST /webhooks/whatsapp    <- Control Plane proxy                 | |
|  |  POST /store/agent/chat     <- Storefront (customer chat)          | |
|  |  POST /admin/agent/chat     <- Marketing App (admin chat)          | |
|  +--------------------------------------------------------------------+ |
|                              |                                           |
|                              v                                           |
|  +--------------------------------------------------------------------+ |
|  |              AI Agent Module (Medusa Plugin)                        | |
|  |                                                                    | |
|  |  +--------------------------------------------------------------+ | |
|  |  |                  AgentModuleService                           | | |
|  |  |                                                               | | |
|  |  |  processMessage(threadId, text, context) {                    | | |
|  |  |    tools = context.role === "admin"                           | | |
|  |  |      ? [...customerTools, ...adminTools]                      | | |
|  |  |      : customerTools                                          | | |
|  |  |                                                               | | |
|  |  |    prompt = getPromptForRole(context.role)                    | | |
|  |  |    return graph.invoke({ messages, tools, prompt })           | | |
|  |  |  }                                                            | | |
|  |  +--------------------------------------------------------------+ | |
|  |                              |                                     | |
|  |                              v                                     | |
|  |  +--------------------------------------------------------------+ | |
|  |  |                 LangGraph Runtime                             | | |
|  |  |                                                               | | |
|  |  |  +------------+    +------------+    +------------+           | | |
|  |  |  |   Agent    |--->|   Tools    |--->|   Agent    |           | | |
|  |  |  |    Node    |<---|    Node    |<---|    Node    |           | | |
|  |  |  +------------+    +------------+    +------------+           | | |
|  |  |        |                                     |                 | | |
|  |  |        +-------------> END <-----------------+                 | | |
|  |  |                                                               | | |
|  |  |  State: messages[], cartId, threadId                          | | |
|  |  |  Checkpointer: RedisSaver (Upstash)                           | | |
|  |  |  Model: Google Gemini                                         | | |
|  |  +--------------------------------------------------------------+ | |
|  |                              |                                     | |
|  |                              v                                     | |
|  |  +--------------------------------------------------------------+ | |
|  |  |                      Tools Layer                              | | |
|  |  |                                                               | | |
|  |  |  CUSTOMER TOOLS          |        ADMIN TOOLS                 | | |
|  |  |  ---------------------   |   -------------------------        | | |
|  |  |  search_products         |   create_product                   | | |
|  |  |  get_or_create_cart      |   update_product                   | | |
|  |  |  add_item_to_cart        |   delete_product                   | | |
|  |  |  get_cart                |   get_inventory                    | | |
|  |  |  remove_from_cart        |   update_inventory                 | | |
|  |  |  track_order             |   low_stock_alerts                 | | |
|  |  |  order_history           |   list_orders                      | | |
|  |  |  initiate_checkout       |   fulfill_order                    | | |
|  |  |                          |   cancel_order                     | | |
|  |  |                          |   sales_summary                    | | |
|  |  |                          |   top_products                     | | |
|  |  +--------------------------------------------------------------+ | |
|  +--------------------------------------------------------------------+ |
|                              |                                           |
|                              v                                           |
|  +--------------------------------------------------------------------+ |
|  |                   MedusaJS Modules                                  | |
|  |                                                                    | |
|  |  Product Module | Cart Module | Order Module | Inventory Module    | |
|  |  Customer Module | Pricing Module | Region Module                  | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
+-------------------------------------------------------------------------+
```

## Component Responsibilities

### Control Plane

| Component                | Responsibility                                     |
| ------------------------ | -------------------------------------------------- |
| WhatsApp Webhook Handler | Receive all webhooks, verify signatures            |
| Tenant Lookup Service    | Map phone numbers to tenant IDs                    |
| Admin Phone Registry     | Store admin phone → tenant mappings                |
| Proxy Layer              | Forward requests to tenant instances with IAM auth |

### Tenant Instance

| Component            | Responsibility                                 |
| -------------------- | ---------------------------------------------- |
| Agent Module Service | Orchestrate AI agent execution                 |
| LangGraph Runtime    | Manage conversation state and tool execution   |
| Redis Checkpointer   | Persist conversation history                   |
| Tools Layer          | Execute business operations via Medusa modules |

### Marketing App

| Component        | Responsibility                            |
| ---------------- | ----------------------------------------- |
| Admin Chat UI    | Dashboard chat interface for store owners |
| Auth Integration | Resolve tenant from Better Auth session   |
| API Proxy        | Forward chat requests to Control Plane    |

### Storefront

| Component            | Responsibility                           |
| -------------------- | ---------------------------------------- |
| Customer Chat Widget | Floating chat for shoppers               |
| Tenant Resolution    | Identify tenant from hostname            |
| API Proxy            | Forward chat requests to tenant instance |

## Data Flow

### Customer Chat (Storefront)

```
Customer Input
    |
    v
+-----------------+
| Customer Chat   |
| Widget (React)  |
+--------+--------+
         | POST /api/agent/chat
         v
+-----------------+
| Storefront API  |
| Route           |
+--------+--------+
         | Resolve tenant from host
         | POST to tenant instance
         v
+-----------------+
| Tenant Instance |
| /store/agent/   |
| chat            |
+--------+--------+
         |
         v
+-----------------+
| AgentModule     |
| Service         |
| role: customer  |
+--------+--------+
         |
         v
+-----------------+
| Customer Tools  |
| + Gemini LLM    |
+--------+--------+
         |
         v
    Response
```

### Admin Chat (Marketing App)

```
Admin Input
    |
    v
+-----------------+
| Admin Chat      |
| Widget (React)  |
+--------+--------+
         | POST /api/admin/agent/chat
         v
+-----------------+
| Marketing API   |
| Route           |
+--------+--------+
         | Resolve tenant from session
         | POST to Control Plane
         v
+-----------------+
| Control Plane   |
| Proxy Route     |
+--------+--------+
         | IAM Auth
         | POST to tenant instance
         v
+-----------------+
| Tenant Instance |
| /admin/agent/   |
| chat            |
+--------+--------+
         |
         v
+-----------------+
| AgentModule     |
| Service         |
| role: admin     |
+--------+--------+
         |
         v
+-----------------+
| Admin Tools     |
| + Gemini LLM    |
+--------+--------+
         |
         v
    Response
```

### WhatsApp (Customer)

```
Customer WhatsApp Message
    |
    v
+-----------------+
| Facebook/Twilio |
| API             |
+--------+--------+
         | Webhook POST
         v
+-----------------+
| Control Plane   |
| /webhooks/      |
| whatsapp        |
+--------+--------+
         | to = store's WhatsApp
         | lookup tenant by to
         | role = "customer"
         v
+-----------------+
| Tenant Instance |
| /webhooks/      |
| whatsapp        |
+--------+--------+
         |
         v
+-----------------+
| AgentModule     |
| Service         |
+--------+--------+
         |
         v
+-----------------+
| Customer Tools  |
| + Gemini LLM    |
+--------+--------+
         |
         v
    Response
         |
         v
+-----------------+
| WhatsApp API    |
| Send Reply      |
+-----------------+
```

### WhatsApp (Admin)

```
Store Owner WhatsApp Message
    |
    v
+-----------------+
| Facebook/Twilio |
| API             |
+--------+--------+
         | Webhook POST
         | to = VENDIN_WHATSAPP
         v
+-----------------+
| Control Plane   |
| /webhooks/      |
| whatsapp        |
+--------+--------+
         | from = admin phone
         | lookup tenant by admin phone
         | role = "admin"
         v
+-----------------+
| Tenant Instance |
| /webhooks/      |
| whatsapp        |
+--------+--------+
         |
         v
+-----------------+
| AgentModule     |
| Service         |
+--------+--------+
         |
         v
+-----------------+
| Admin Tools     |
| + Gemini LLM    |
+--------+--------+
         |
         v
    Response
         |
         v
+-----------------+
| WhatsApp API    |
| Send Reply      |
+-----------------+
```

## Conversation Memory

### Redis Key Structure

```
{tenantId}:{role}:{threadId}

Examples:
+-- moda-brasil:customer:+551199991111
+-- moda-brasil:admin:+551188881111
+-- tech-store:customer:session_abc123
+-- tech-store:admin:user_xyz789
```

### Memory Scope

| Channel             | Thread ID    | Scope                                    |
| ------------------- | ------------ | ---------------------------------------- |
| Customer WhatsApp   | Phone number | Persistent across sessions               |
| Customer Storefront | Session ID   | Session-scoped (or user ID if logged in) |
| Admin WhatsApp      | Phone number | Persistent                               |
| Admin Dashboard     | User ID      | Persistent                               |

## Security Model

### Authentication

| Channel                  | Auth Method                        |
| ------------------------ | ---------------------------------- |
| Customer Storefront Chat | Session-based (optional login)     |
| Customer WhatsApp        | Phone number as identity           |
| Admin Dashboard Chat     | Better Auth session                |
| Admin WhatsApp           | Phone number verified & registered |

### Authorization

| Role       | Tools Access                               |
| ---------- | ------------------------------------------ |
| `customer` | Customer tools only (search, cart, orders) |
| `admin`    | All tools (customer + admin tools)         |

### Tenant Isolation

- Each tenant instance has isolated database
- Redis keys prefixed with `tenantId`
- Control Plane validates tenant access before proxying
