# API Reference

**Last Updated**: 2026-02-15

## Overview

The AI Agent platform exposes REST APIs for web chat and WhatsApp webhooks.

---

## Control Plane APIs

### WhatsApp Webhook

**Endpoint**: `POST /webhooks/whatsapp/:provider`

Receives webhooks from Facebook or Twilio.

#### Facebook

```http
POST /webhooks/whatsapp/facebook
X-Hub-Signature-256: sha256=...

{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": {
          "display_phone_number": "+551199991111"
        },
        "messages": [{
          "from": "+551188881111",
          "id": "wamid.xxx",
          "text": { "body": "Show me red shoes" }
        }]
      }
    }]
  }]
}
```

#### Twilio

```http
POST /webhooks/whatsapp/twilio
X-Twilio-Signature: ...

From=whatsapp%3A%2B551188881111
To=whatsapp%3A%2B551199991111
Body=Show+me+red+shoes
MessageSid=SMxxx
```

#### Response

```json
{
  "success": true
}
```

#### Webhook Verification (Facebook)

```http
GET /webhooks/whatsapp/facebook?hub.mode=subscribe&hub.challenge=CHALLENGE&hub.verify_token=VERIFY_TOKEN
```

Returns the challenge string if verify_token matches.

---

## Tenant Instance APIs

### Customer Chat

**Endpoint**: `POST /store/agent/chat`

Send a customer message to the AI agent.

#### Request

```http
POST /store/agent/chat
Content-Type: application/json

{
  "message": "Show me red shoes under $50",
  "sessionId": "sess_abc123",     // Optional
  "customerId": "cus_xyz789"      // Optional, if logged in
}
```

#### Response

```json
{
  "response": "I found 3 pairs of red shoes under $50...",
  "threadId": "sess_abc123"
}
```

#### Error Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before sending another message."
  }
}
```

---

### Admin Chat

**Endpoint**: `POST /admin/agent/chat`

Send an admin message to the AI agent.

#### Request

```http
POST /admin/agent/chat
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "message": "Add 100 units to SKU-SHOE-RED-M",
  "userId": "user_admin123"
}
```

#### Response

```json
{
  "response": "I've updated the inventory for SKU-SHOE-RED-M...",
  "threadId": "user_admin123"
}
```

---

### WhatsApp Webhook (Internal)

**Endpoint**: `POST /webhooks/whatsapp`

Receives proxied WhatsApp messages from Control Plane.

#### Request

```http
POST /webhooks/whatsapp
Content-Type: application/json
Authorization: Bearer {iam_token}

{
  "from": "+551188881111",
  "message": "Show me red shoes",
  "role": "customer",
  "threadId": "+551188881111"
}
```

#### Response

```json
{
  "text": "I found 3 pairs of red shoes..."
}
```

---

## Marketing App APIs

### Admin Chat

**Endpoint**: `POST /api/admin/agent/chat`

Proxy endpoint for dashboard chat.

#### Request

```http
POST /api/admin/agent/chat
Content-Type: application/json
Cookie: better-auth.session_token={session_token}

{
  "message": "Show me today's sales"
}
```

#### Response

```json
{
  "response": "Today you've had 12 orders totaling $1,234.56...",
  "threadId": "user_xyz"
}
```

#### Error Responses

```json
// Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You must be logged in to use this endpoint."
  }
}

// Forbidden
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have access to this tenant."
  }
}
```

---

### Admin Phone Registration

**Endpoint**: `POST /api/admin/phone/register`

Register admin phone for WhatsApp.

#### Request

```http
POST /api/admin/phone/register
Content-Type: application/json
Cookie: better-auth.session_token={session_token}

{
  "phone": "+551199991111"
}
```

#### Response

```json
{
  "success": true,
  "message": "OTP sent to WhatsApp"
}
```

#### Error Response

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Phone number must be in E.164 format (e.g., +551199991111)"
  }
}
```

---

**Endpoint**: `PUT /api/admin/phone/verify`

Verify OTP and complete registration.

#### Request

```http
PUT /api/admin/phone/verify
Content-Type: application/json
Cookie: better-auth.session_token={session_token}

{
  "phone": "+551199991111",
  "otp": "123456"
}
```

#### Response

```json
{
  "success": true,
  "message": "Phone registered successfully"
}
```

#### Error Response

```json
{
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid or expired OTP. Please request a new one."
  }
}
```

---

**Endpoint**: `GET /api/admin/phone/status`

Check phone registration status.

#### Request

```http
GET /api/admin/phone/status
Cookie: better-auth.session_token={session_token}
```

#### Response

```json
{
  "registered": true,
  "phone": "+5511****1111", // Masked for privacy
  "verifiedAt": "2026-02-15T10:30:00Z"
}
```

---

**Endpoint**: `DELETE /api/admin/phone`

Remove registered phone.

#### Request

```http
DELETE /api/admin/phone
Cookie: better-auth.session_token={session_token}
```

#### Response

```json
{
  "success": true,
  "message": "Phone removed successfully"
}
```

---

## Storefront APIs

### Customer Chat

**Endpoint**: `POST /api/agent/chat`

Proxy endpoint for storefront chat.

#### Request

```http
POST /api/agent/chat
Content-Type: application/json

{
  "message": "I'm looking for running shoes",
  "sessionId": "sess_abc123"  // Required for session persistence
}
```

#### Response

```json
{
  "response": "We have several running shoes available...",
  "threadId": "sess_abc123"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Phone number must be in E.164 format"
  }
}
```

### Error Codes

| Code             | HTTP Status | Description               |
| ---------------- | ----------- | ------------------------- |
| `INVALID_INPUT`  | 400         | Request validation failed |
| `UNAUTHORIZED`   | 401         | Authentication required   |
| `FORBIDDEN`      | 403         | Insufficient permissions  |
| `NOT_FOUND`      | 404         | Resource not found        |
| `RATE_LIMITED`   | 429         | Too many requests         |
| `INTERNAL_ERROR` | 500         | Server error              |

---

## Rate Limits

| Endpoint                    | Limit       | Window             |
| --------------------------- | ----------- | ------------------ |
| `/store/agent/chat`         | 60 requests | 1 minute           |
| `/admin/agent/chat`         | 60 requests | 1 minute           |
| `/webhooks/whatsapp`        | 20 messages | 1 minute per phone |
| `/api/admin/phone/register` | 3 requests  | 1 minute           |

---

## Request/Response Schemas

### Customer Chat Request

```typescript
interface CustomerChatRequest {
  message: string; // Required, max 2000 chars
  sessionId: string; // Required, for session persistence
  customerId?: string; // Optional, for logged-in users
}
```

### Customer Chat Response

```typescript
interface CustomerChatResponse {
  response: string; // Agent's text response
  threadId: string; // Conversation thread ID
}
```

### Admin Chat Request

```typescript
interface AdminChatRequest {
  message: string; // Required, max 2000 chars
  userId: string; // Required, admin user ID
}
```

### Admin Chat Response

```typescript
interface AdminChatResponse {
  response: string; // Agent's text response
  threadId: string; // Conversation thread ID
}
```

### WhatsApp Webhook Request (Internal)

```typescript
interface WhatsAppWebhookRequest {
  from: string; // Sender phone (E.164)
  message: string; // Message text
  role: "admin" | "customer";
  threadId: string; // Conversation thread ID
}
```

### WhatsApp Webhook Response

```typescript
interface WhatsAppWebhookResponse {
  text: string; // Response text to send back
}
```

---

## Authentication

### Marketing App APIs

Uses Better Auth session cookies:

```http
Cookie: better-auth.session_token=xxx
```

### Tenant Instance APIs

- `/store/agent/chat`: No auth required (optional customer auth)
- `/admin/agent/chat`: Requires admin JWT token
- `/webhooks/whatsapp`: Requires IAM token from Control Plane

### Control Plane APIs

- `/webhooks/whatsapp/*`: No auth (signature verification only)

---

## Versioning

All APIs are versioned via URL path:

```
/api/v1/admin/agent/chat
```

Current version: `v1` (implicit, not in URL yet). Explicit versioning (e.g., `/api/v1/...`) will be introduced when breaking changes are necessary.

Breaking changes will introduce explicit versioning.
