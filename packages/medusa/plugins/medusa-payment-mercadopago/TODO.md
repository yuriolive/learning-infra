# MercadoPago Plugin TODOs

## Future Improvements

- [ ] **Checkout Pro Support**:
  - Integrate `Preference` client from `mercadopago` SDK.
  - Implement a flow to generate and return `init_point` for hosted checkout redirection.
  - Add support for `back_urls` and `auto_return` configuration.

- [ ] **Subscriptions Support**:
  - Integrate `PreApproval` and `Plan` clients.
  - Implement recurring payment flows and lifecycle management.
  - Map subscription-specific webhook events.

- [ ] **Checkout API (Orders)**:
  - Expand support for `MerchantOrder` resource if needed for complex reconciliation flows.

- [ ] **Enhanced Validation**:
  - Add stricter Brazilian-specific validations for CPF/CNPJ and address formats.
  - Implement more robust error mapping for common MercadoPago rejection codes.
