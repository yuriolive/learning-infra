# TODO - Bling Plugin Enhancements

This document tracks future improvements and enhancements for the `@vendin/medusa-plugin-bling` plugin.

## 🔒 Security

### Webhook Signature Validation

**Priority: High**  
**File:** `src/api/store/bling/webhook/route.ts`

Implement signature validation for incoming webhooks to ensure requests are genuinely from Bling. The `BlingConfig` entity already has a `webhookSecret` field that should be used for HMAC verification.

```typescript
// Validate webhook signature using config.webhookSecret
const signature = req.headers["x-bling-signature"];
const isValid = validateBlingSignature(
  req.body,
  signature,
  config.webhookSecret,
);
```

## 🏗️ Architecture Improvements

### Service Constructor Pattern

**Priority: Medium**  
**File:** `src/modules/bling/service.ts`

Replace the unconventional `super(...arguments)` pattern with Medusa v2 standard:

```typescript
constructor(deps: InjectedDependencies, options: BlingModuleOptions = {}) {
  super(deps);
  this.logger_ = deps.logger;
  // ...
}
```

### Return BlingConfig from OAuth Callback

**Priority: Low**  
**File:** `src/modules/bling/service.ts`

Consider returning the `BlingConfig` entity instead of just `{ success: boolean }` to make the method more versatile:

```typescript
async handleOAuthCallback(code: string): Promise<BlingConfig>
```

### Separate Order Retrieval Step

**Priority: Low**  
**File:** `src/workflows/steps/sync-order-step.ts`

Create a separate `retrieve-order-step` before `syncOrderToBlingStep` for better modularity and testability.

## 🌐 Internationalization

### Dynamic Currency Conversion

**Priority: High**  
**File:** `src/modules/bling/utils/order-mapper.ts`

Replace hardcoded `/100` division with dynamic currency handling to support zero-decimal currencies (e.g., JPY):

```typescript
// TODO: Inject PriceSelectionStrategy or access region's currency
// to determine correct divisor dynamically
const divisor = getCurrencyDivisor(order.currency_code); // 100 for BRL, 1 for JPY
const finalUnitPrice = unitPrice / divisor;
```

## 📦 Workflows

### Webhook Processing Workflow

**Priority: Medium**  
**File:** `src/api/store/bling/webhook/route.ts`, `src/workflows/`

Create a dedicated `process-bling-webhook-workflow` to handle webhook events:

- Parse webhook type (stock update, order status, etc.)
- Trigger appropriate workflows (inventory sync, order update)
- Improve error handling and traceability
- Keep route handler thin (just trigger workflow)

Example:

```typescript
// In route.ts
await processBlingWebhookWorkflow(req.scope).run({
  input: { type: webhookType, payload: req.body },
});
```

## 🏪 Multi-Location Support

### Inventory Location Mapping

**Priority: Medium**  
**File:** `src/workflows/steps/update-inventory-step.ts`

Enhance multi-location support by mapping Medusa stock locations to Bling warehouse IDs:

- Use `preferences.inventory.locations` array for mapping
- Support multiple warehouses instead of defaulting to first location
- Map by `deposito_id` from Bling

```typescript
// preferences.inventory.locations
[
  { medusa_id: "loc_123", bling_id: "deposito_456" },
  { medusa_id: "loc_789", bling_id: "deposito_012" },
];
```

## 🔧 Type Safety

### Remove `as any` Assertions

**Priority: Medium**  
**Files:** `src/workflows/steps/update-inventory-step.ts`

Update `@medusajs/types` or ensure module interfaces are fully typed to avoid `as any` workarounds:

- `(inventoryModule as any).listStockLocations` → properly typed
- `(inventoryModule as any).updateInventoryLevels` → properly typed

## 🎯 Error Handling

### Explicit Inventory Level Checks

**Priority: Low**  
**File:** `src/workflows/steps/update-inventory-step.ts`

Replace error-based flow control with explicit checks:

```typescript
// Instead of try/catch for updateInventoryLevels
const existingLevel = await inventoryModule.retrieveInventoryLevel({
  inventory_item_id: item.id,
  location_id: defaultLocationId
});

if (existingLevel) {
  await inventoryModule.updateInventoryLevels([...]);
} else {
  await inventoryModule.createInventoryLevels({...});
}
```

## 📝 Code Clarity

### Migration Script Comment

**Priority: Low** ✅ **DONE**  
**File:** `apps/control-plane/src/database/migrate.ts`

Added descriptive comment for `process.exit()` usage.

## 🔄 Pagination

### Configurable Product Fetch Limit

**Priority: Low** ✅ **DONE**  
**File:** `src/workflows/steps/fetch-bling-products-step.ts`

Pagination now implemented with configurable limit. Consider adding to `preferences.products.fetch_limit` for user control.

---

## Legend

- 🔒 Security
- 🏗️ Architecture
- 🌐 Internationalization
- 📦 Workflows
- 🏪 Multi-Location
- 🔧 Type Safety
- 🎯 Error Handling
- 📝 Code Clarity
- 🔄 Pagination

**Priority Levels:**

- **High:** Critical for production or significantly impacts functionality
- **Medium:** Important improvements that enhance robustness
- **Low:** Nice-to-have refinements and optimizations
