export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SubdomainRequiredError extends TenantError {
  constructor() {
    super("Subdomain is required for deployment");
  }
}

export class SubdomainInUseError extends TenantError {
  constructor() {
    super("Subdomain already in use");
  }
}

export class TenantNotFoundError extends TenantError {
  constructor() {
    super("Tenant not found");
  }
}
