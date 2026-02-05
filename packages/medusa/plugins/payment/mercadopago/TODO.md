# MercadoPago Plugin Roadmap (Medusa v2 Architecture)

This document outlines the architectural split for implementing new features, distinguishing between **Workflows** (Orchestration & State) and **Provider Service** (SDK & API Logic).

---

## 🚀 Checkout Pro (Hosted Checkout)

### 🟢 WORKFLOW: `create-mercadopago-preference-workflow`

**Responsibility:** Orchestrate the creation of a preference and handle the cart context.

- [ ] **Step 1: Validate Cart**: Ensure cart has items, email, and currency (BRL).
- [ ] **Step 2: Create Preference**: Call the Payment Provider to generate the standard preference.
- [ ] **Step 3: Store Metadata**: Save the `preference_id` and `init_point` (redirect URL) to the Payment Session data in Medusa.
- [ ] **Return**: The `init_point` URL to the storefront for redirection.

### 🔵 PROVIDER SERVICE: `MercadoPagoPaymentService`

**Responsibility:** Low-level interaction with MercadoPago `Preference` API.

- [ ] **Method: `createPreference(cartData)`**:
  - Build payload from cart items.
  - Set `back_urls` (success, failure, pending) based on plugin options.
  - Set `auto_return` policy.
  - Call `preference.create()` using the SDK.
  - Return the raw preference object.

---

## 🔄 Subscriptions (Recurring Payments)

### 🟢 WORKFLOW: `create-subscription-workflow`

**Responsibility:** Manage the subscription lifecycle and link it to a Customer.

- [ ] **Step 1: Check Customer**: Ensure the customer exists in MercadoPago (create if not).
- [ ] **Step 2: Create Preapproval**: Call Provider to create the subscription plan.
- [ ] **Step 3: Persist Data**: Store the `preapproval_id` in a custom `Subscription` module or metadata.
- [ ] **Step 4: Tag Order**: Mark the initial order as "Subscription Start".

### 🟢 WORKFLOW: `cancel-subscription-workflow`

**Responsibility:** Handle user cancellation requests safely.

- [ ] **Step 1: Fetch Status**: Verify current subscription status.
- [ ] **Step 2: Cancel Remote**: Call Provider to cancel at MercadoPago.
- [ ] **Step 3: Update Local**: Update local status to `canceled`.

### 🔵 PROVIDER SERVICE: `MercadoPagoPaymentService`

**Responsibility:** Low-level interaction with MercadoPago `PreApproval` API.

- [ ] **Method: `createSubscription(planData)`**: Wraps `preapproval.create()`.
- [ ] **Method: `cancelSubscription(id)`**: Wraps `preapproval.update({ status: 'cancelled' })`.
- [ ] **Method: `getSubscription(id)`**: Wraps `preapproval.get()`.

---

## ⚡ Webhook Orchestration

### 🟢 WORKFLOW: `process-mercadopago-webhook-workflow`

**Responsibility:** Handle asynchronous updates transactionally.

- [ ] **Step 1: Verify Signature**: (Should be done at API route level, but validated here).
- [ ] **Step 2: Identify Resource**: Determine if it's a Payment (`payment`) or Subscription (`preapproval`).
- [ ] **Step 3: Sync Status**:
  - If **Payment**: Invoke Medusa's standard `capturePaymentWorkflow` or `updatePaymentCollectionWorkflow`.
  - If **Subscription**: Update custom subscription status.

---

## 🛠️ General Improvements

- [ ] **Validation Utilities**:
  - CPF/CNPJ validator function (used in workflows before submitting to MP).
- [ ] **Error Mapping**:
  - Centralized mapper to convert MP API errors into user-friendly Medusa errors.
