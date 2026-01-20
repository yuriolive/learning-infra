// Tenant Instance Deployment Pattern (Programmatic)
const serviceName = `tenant-${tenantId}`;
await cloudRunApi.createService({
  name: serviceName,
  image: 'southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest',
  minInstances: 0,
  maxInstances: 10,
  secrets: {
    DATABASE_URL: `tenant-${tenantId}-db-url:latest`
  },
  env: {
    TENANT_ID: tenantId,
    REDIS_NAMESPACE: `tenant-${tenantId}`
  }
});
