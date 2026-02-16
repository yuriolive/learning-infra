# AI Agent Tools Reference

**Last Updated**: 2026-02-16

## Overview

Tools are functions the AI agent can execute to interact with the MedusaJS backend. They are categorized by role access.

## Customer Tools

### Product Tools

#### `search_products`

Search products by query string.

```typescript
// Input
{
  query: string; // Search term (e.g., "red shoes", "laptop under $500")
}

// Output
[
  {
    id: "prod_123",
    title: "Red Running Shoes",
    handle: "red-running-shoes",
    price_display: "USD 79.99",
    thumbnail: "https://...",
  },
];
```

**Implementation**: `packages/medusa/plugins/ai/agent/src/tools/customer/products.ts`

---

### Cart Tools

#### `get_or_create_cart`

Get existing active cart or create new one for customer.

```typescript
// Input
{
  customer_id: string; // Customer ID
}

// Output
("cart_abc123"); // Cart ID
```

#### `add_item_to_cart`

Add product variant to cart.

```typescript
// Input
{
  cart_id: string,
  variant_id: string,
  quantity: number
}

// Output
"Item added to cart successfully."
```

#### `get_cart`

View cart contents.

```typescript
// Input
{
  cart_id: string
}

// Output
{
  id: "cart_abc123",
  items: [
    {
      id: "item_1",
      title: "Red Running Shoes",
      quantity: 2,
      unit_price: 79.99,
      total: 159.98
    }
  ],
  subtotal: 159.98,
  currency: "USD"
}
```

#### `remove_from_cart`

Remove item from cart.

```typescript
// Input
{
  cart_id: string,
  item_id: string
}

// Output
"Item removed from cart."
```

#### `update_cart_item`

Update item quantity.

```typescript
// Input
{
  cart_id: string,
  item_id: string,
  quantity: number
}

// Output
"Cart updated successfully."
```

---

### Order Tools

#### `track_order`

Check order status by ID or order number.

```typescript
// Input
{
  order_id: string  // or order_number
}

// Output
{
  id: "order_xyz",
  display_id: "#1001",
  status: "shipped",
  fulfillment_status: "shipped",
  payment_status: "captured",
  tracking_number: "1Z999AA10123456784",
  tracking_url: "https://...",
  estimated_delivery: "2026-02-20",
  items: [...]
}
```

#### `order_history`

Get customer's past orders.

```typescript
// Input
{
  customer_id: string,
  limit?: number  // Default: 10
}

// Output
[
  {
    id: "order_xyz",
    display_id: "#1001",
    status: "delivered",
    total: 159.98,
    created_at: "2026-02-01",
    items_count: 2
  }
]
```

---

### Checkout Tools

#### `initiate_checkout`

Start checkout process.

```typescript
// Input
{
  cart_id: string
}

// Output
{
  checkout_url: "https://store.com/checkout/cart_abc123",
  requires_shipping: true,
  available_payment_methods: ["card", "pix"]
}
```

---

## Admin Tools

### Product Management Tools

#### `list_products`

List all products with pagination.

```typescript
// Input
{
  page?: number,      // Default: 1
  limit?: number,     // Default: 20
  status?: string     // "published" | "draft" | "all"
}

// Output
{
  products: [
    {
      id: "prod_123",
      title: "Red Running Shoes",
      status: "published",
      variants_count: 3,
      inventory_count: 150
    }
  ],
  total: 45,
  page: 1,
  limit: 20
}
```

#### `create_product`

Create a new product.

```typescript
// Input
{
  title: string,
  description?: string,
  is_giftcard?: boolean,
  discountable?: boolean,
  images?: string[],      // URLs
  tags?: string[],
  variants: [
    {
      title: string,
      sku?: string,
      prices: [
        { currency_code: string, amount: number }
      ],
      inventory_quantity?: number
    }
  ]
}

// Output
{
  id: "prod_new",
  title: "New Product",
  handle: "new-product",
  status: "draft"
}
```

#### `update_product`

Update product details.

```typescript
// Input
{
  id: string,
  title?: string,
  description?: string,
  status?: "published" | "draft",
  // ... other fields
}

// Output
{
  id: "prod_123",
  title: "Updated Title",
  // ... updated fields
}
```

#### `delete_product`

Archive/delete a product.

```typescript
// Input
{
  id: string;
}

// Output
("Product archived successfully.");
```

---

### Inventory Tools

#### `get_inventory`

Check stock levels.

```typescript
// Input
{
  product_id?: string,     // Optional filter
  variant_id?: string,     // Optional filter
  low_stock_threshold?: number  // Filter below threshold
}

// Output
[
  {
    variant_id: "variant_1",
    variant_title: "Size M / Red",
    sku: "SHOE-M-RED",
    inventory_quantity: 15,
    reserved_quantity: 2,
    available_quantity: 13
  }
]
```

#### `update_inventory`

Adjust stock quantities.

```typescript
// Input
{
  variant_id: string,
  adjustment: number,  // Positive to add, negative to subtract
  reason?: string      // "restock", "damage", "inventory_check"
}

// Output
{
  variant_id: "variant_1",
  previous_quantity: 15,
  new_quantity: 115,
  adjustment: 100
}
```

#### `low_stock_alerts`

Get products below threshold.

```typescript
// Input
{
  threshold?: number  // Default: 10
}

// Output
[
  {
    variant_id: "variant_1",
    product_title: "Red Running Shoes",
    variant_title: "Size S / Red",
    sku: "SHOE-S-RED",
    current_quantity: 3,
    threshold: 10
  }
]
```

---

### Order Management Tools

#### `list_orders`

List orders with filters.

```typescript
// Input
{
  status?: string,           // "pending", "completed", "canceled"
  fulfillment_status?: string,
  payment_status?: string,
  date_from?: string,        // ISO date
  date_to?: string,
  page?: number,
  limit?: number
}

// Output
{
  orders: [
    {
      id: "order_xyz",
      display_id: "#1001",
      status: "pending",
      total: 159.98,
      customer_email: "customer@email.com",
      created_at: "2026-02-15T10:30:00Z"
    }
  ],
  total: 100,
  page: 1
}
```

#### `fulfill_order`

Mark order as fulfilled.

```typescript
// Input
{
  order_id: string,
  tracking_number?: string,
  tracking_url?: string,
  notify_customer?: boolean  // Default: true
}

// Output
{
  order_id: "order_xyz",
  fulfillment_status: "fulfilled",
  tracking_number: "1Z999AA10123456784"
}
```

#### `cancel_order`

Cancel an order.

```typescript
// Input
{
  order_id: string,
  reason: string,
  refund?: boolean,         // Default: true if payment captured
  notify_customer?: boolean
}

// Output
{
  order_id: "order_xyz",
  status: "canceled",
  refund_initiated: true,
  refund_amount: 159.98
}
```

---

### Analytics Tools

#### `sales_summary`

Get sales statistics.

```typescript
// Input
{
  period: "today" | "week" | "month" | "custom",
  date_from?: string,  // Required for "custom"
  date_to?: string
}

// Output
{
  period: "week",
  total_orders: 45,
  total_revenue: 4523.50,
  average_order_value: 100.52,
  comparison: {
    orders_change: 12.5,    // Percentage
    revenue_change: 8.3
  }
}
```

#### `top_products`

Get best-selling products.

```typescript
// Input
{
  period: "week" | "month" | "all_time",
  limit?: number  // Default: 10
}

// Output
[
  {
    product_id: "prod_123",
    title: "Red Running Shoes",
    units_sold: 45,
    revenue: 3599.55,
    rank: 1
  }
]
```

---

## Tool Implementation Pattern

```typescript
// packages/medusa/plugins/ai/agent/src/tools/customer/products.ts

import { tool } from "@langchain/core/tools";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import type { IProductModuleService } from "@medusajs/framework/types";
import type { MedusaContainer } from "@medusajs/medusa";

export function getProductTools(container: MedusaContainer) {
  return [
    tool(
      async ({ query }: { query: string }) => {
        const productModule: IProductModuleService = container.resolve(
          Modules.PRODUCT,
        );

        const [products] = await productModule.listAndCountProducts(
          { q: query, status: "published" },
          { take: 5, relations: ["variants"] },
        );

        return JSON.stringify(
          products.map((p) => ({
            id: p.id,
            title: p.title,
            handle: p.handle,
            // ... format for LLM
          })),
        );
      },
      {
        name: "search_products",
        description:
          "Search products by query. Returns id, title, handle, price.",
        schema: z.object({
          query: z.string().describe("Search term"),
        }),
      },
    ),
  ];
}
```

## Tool Registration

```typescript
// packages/medusa/plugins/ai/agent/src/tools/index.ts

import type { MedusaContainer } from "@medusajs/medusa";
import type { StructuredToolInterface } from "@langchain/core/tools";

export function getCustomerTools(
  container: MedusaContainer,
): StructuredToolInterface[] {
  return [
    ...getProductTools(container),
    ...getCartTools(container),
    ...getOrderTools(container),
    ...getCheckoutTools(container),
  ];
}

export function getAdminTools(
  container: MedusaContainer,
): StructuredToolInterface[] {
  return [
    ...getAdminProductTools(container),
    ...getInventoryTools(container),
    ...getAdminOrderTools(container),
    ...getAnalyticsTools(container),
  ];
}

export function getToolsForRole(
  container: MedusaContainer,
  role: "admin" | "customer",
): StructuredToolInterface[] {
  const customerTools = getCustomerTools(container);

  if (role === "admin") {
    return [...customerTools, ...getAdminTools(container)];
  }

  return customerTools;
}
```

## Tool Output Guidelines

### For LLM Consumption

Tool outputs should be:

1. **Concise**: Return only essential data
2. **Structured**: Use JSON for complex data
3. **Human-readable**: The LLM will relay this to users

### Example Output Formats

```typescript
// Good - Concise and structured
{
  "id": "prod_123",
  "title": "Red Running Shoes",
  "price": "USD 79.99"
}

// Bad - Too verbose
{
  "id": "prod_123",
  "title": "Red Running Shoes",
  "description": "Experience ultimate comfort with our premium...",
  "metadata": { "internal_code": "RS-2024", "warehouse": "A" },
  "created_at": "2026-01-15T08:00:00Z",
  "updated_at": "2026-02-10T14:30:00Z",
  // ... many more fields
}
```

## Error Handling

Tools should return error messages as strings, not throw exceptions:

```typescript
// Good
return `Error: Product not found with ID ${id}`;

// Bad
throw new Error(`Product not found with ID ${id}`);
```

This allows the LLM to understand the error and respond appropriately to the user.
