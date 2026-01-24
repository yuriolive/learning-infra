# Tenant Provisioning Setup Guide

## Overview

This document describes the end-to-end tenant provisioning workflow for the multi-tenant e-commerce platform. The Control Plane orchestrates the complete provisioning process, creating isolated infrastructure for each merchant.

## Architecture

```
Provisioning Flow:
┌─────────────────┐
│ Merchant Signup │
│ (via API/UI)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Control Plane   │  (Orchestrates provisioning)
│ (Cloud Run)     │
└────────┬────────┘
         │
         ├─▶ Create Neon Database
         ├─▶ Create Cloud Run Service
         ├─▶ Configure Secrets
         ├─▶ Add Cloudflare Hostname (if custom domain)
         ├─▶ Initialize MedusaJS
         └─▶ Verify Health
```

## Prerequisites

Before provisioning tenants, ensure all infrastructure is set up:

- [ ] Control Plane deployed and accessible
- [ ] Neon API credentials configured (`NEON_API_KEY`, `NEON_PROJECT_ID`)
- [ ] Google Cloud Run API enabled
- [ ] Cloudflare for SaaS configured
- [ ] Secret Manager access configured (including `neon-api-key` and `neon-project-id`)
- [ ] Tenant instance container image built and pushed

## Provisioning Workflow

### Step 1: Merchant Signup Request

The Control Plane receives a tenant creation request:

```typescript
// Example API request
POST /api/tenants
{
  "merchantEmail": "merchant@example.com",
  "storeName": "My Awesome Store",
  "plan": "starter",
  "customDomain": "shop.example.com" // Optional
}
```

### Step 2: Create Neon Database

The Control Plane creates an isolated database for the tenant:

```bash
# Via Neon API (Control Plane implementation)
POST https://console.neon.tech/api/v2/projects/{project_id}/branches
Authorization: Bearer {neon_api_key}
Content-Type: application/json

{
  "branch": {
    "name": "tenant-{tenantId}"
  }
}
```

**Response includes:**

- Database connection string
- Database ID
- Region information

**Store connection string in Secret Manager:**

```bash
# Control Plane creates secret
echo -n "${DATABASE_URL}" | \
  gcloud secrets create tenant-${TENANT_ID}-db-url \
    --project=vendin-store \
    --data-file=-

# Grant tenant instance access
gcloud secrets add-iam-policy-binding tenant-${TENANT_ID}-db-url \
  --project=vendin-store \
  --member="serviceAccount:cloud-run-sa@vendin-store.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Create Cloud Run Service

Deploy the tenant instance to Cloud Run:

```bash
# Via Cloud Run Admin API (recommended)
POST https://run.googleapis.com/v2/projects/vendin-store/locations/southamerica-east1/services
Authorization: Bearer {gcp_access_token}
Content-Type: application/json

{
  "apiVersion": "serving.knative.dev/v1",
  "kind": "Service",
  "metadata": {
    "name": "tenant-${TENANT_ID}",
    "namespace": "vendin-store"
  },
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "autoscaling.knative.dev/minScale": "0",
          "autoscaling.knative.dev/maxScale": "10"
        }
      },
      "spec": {
        "containerConcurrency": 80,
        "timeoutSeconds": 300,
        "serviceAccountName": "cloud-run-sa@vendin-store.iam.gserviceaccount.com",
        "containers": [{
          "image": "southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest",
          "ports": [{
            "containerPort": 3000
          }],
          "env": [
            {
              "name": "NODE_ENV",
              "value": "production"
            },
            {
              "name": "TENANT_ID",
              "value": "${TENANT_ID}"
            },
            {
              "name": "REDIS_NAMESPACE",
              "value": "tenant-${TENANT_ID}"
            }
          ],
          "resources": {
            "limits": {
              "cpu": "1",
              "memory": "512Mi"
            }
          }
        }]
      }
    }
  }
}
```

**Or via gcloud (for testing):**

```bash
gcloud run services create tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/tenant-instance:latest \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --cpu=1 \
  --memory=512Mi \
  --port=3000 \
  --service-account=cloud-run-sa@vendin-store.iam.gserviceaccount.com \
  --set-env-vars=NODE_ENV=production,TENANT_ID=${TENANT_ID},REDIS_NAMESPACE=tenant-${TENANT_ID} \
  --set-secrets=DATABASE_URL=tenant-${TENANT_ID}-db-url:latest
```

### Step 4: Configure Default Subdomain

Each tenant gets a default subdomain following the Shopify-style pattern: `{merchant-name}.my.vendin.store`

**Subdomain Assignment:**

```typescript
// Control Plane assigns subdomain
const subdomain = generateSubdomain(storeName); // e.g., "awesome-store"
const tenantSubdomain = `${subdomain}.my.vendin.store`;

// Store in tenant record
UPDATE tenants
SET
  subdomain = '${subdomain}',
  default_url = 'https://${tenantSubdomain}'
WHERE id = '${TENANT_ID}'
```

**No additional Cloudflare DNS configuration needed:**

- Wildcard DNS (`*.my.vendin.store`) already configured
- Storefront will route based on hostname pattern
- Tenant can access store at: `https://${subdomain}.my.vendin.store`
- Admin accessible at: `https://${subdomain}.my.vendin.store/admin`

**Benefits of `.my.` pattern:**

- Clear separation from platform services (api, admin, www)
- Familiar pattern (similar to Shopify's `.myshopify.com`)
- Easy DNS management (wildcard only for `*.my.vendin.store`)
- No conflicts with reserved subdomains

````

### Step 5: Add Custom Hostname (If Provided)

If merchant provided a custom domain, add it via Cloudflare for SaaS API:

```bash
# Via Cloudflare API
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames
Authorization: Bearer {cloudflare_api_token}
Content-Type: application/json

{
  "hostname": "shop.example.com",
  "ssl": {
    "method": "http",
    "type": "dv"
  }
}
````

**Response includes:**

- Custom hostname ID
- SSL status (usually "pending")

**Poll for SSL status:**

```bash
# Check SSL provisioning status
GET https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames/{hostname_id}
Authorization: Bearer {cloudflare_api_token}

# Response status values:
# - "pending": Certificate provisioning in progress
# - "active": Certificate issued and active
# - "failed": Certificate provisioning failed
```

**Wait for SSL (with timeout):**

- Poll every 30 seconds
- Maximum wait: 24 hours
- Alert if status is "failed"

### Step 6: Initialize MedusaJS Instance

Once the tenant instance is running, initialize the MedusaJS database:

```bash
# The tenant instance should auto-initialize on first request
# Or trigger via API call to tenant instance:

POST https://tenant-${TENANT_ID}-xxx.a.run.app/admin/init
Content-Type: application/json

{
  "email": "admin@merchant.com",
  "password": "secure-password"
}
```

**Or via direct database migration:**

```bash
# If MedusaJS requires manual migration
# Connect to tenant database and run migrations
psql "${DATABASE_URL}" -f medusa-migrations.sql
```

### Step 7: Health Check Verification

Verify the tenant instance is healthy and responding:

```bash
# Check health endpoint
curl https://tenant-${TENANT_ID}-xxx.a.run.app/health

# Expected response: 200 OK
# Verify:
# - Database connectivity
# - Redis connectivity
# - Admin endpoint accessible
# - Store API endpoint accessible
```

### Step 8: Update Tenant Status

Mark tenant as active in Control Plane database:

```typescript
// Update tenant record
UPDATE tenants
SET
  status = 'active',
  api_url = 'https://tenant-${TENANT_ID}-xxx.a.run.app',
  admin_url = 'https://tenant-${TENANT_ID}-xxx.a.run.app/admin',
  updated_at = NOW()
WHERE id = '${TENANT_ID}'
```

### Step 9: Send Welcome Email

Notify merchant that their store is ready:

```typescript
// Send email with:
// - Store URL (subdomain or custom domain)
// - Admin dashboard URL
// - Login credentials (if created)
// - Next steps guide
```

## Error Handling and Rollback

### Provisioning Failure Scenarios

**Database Creation Fails:**

- Rollback: None needed (database doesn't exist)
- Action: Retry or alert admin

**Cloud Run Service Creation Fails:**

- Rollback: Delete database if created
- Action: Retry or alert admin

**Secret Creation Fails:**

- Rollback: Delete Cloud Run service and database
- Action: Check permissions, retry

**SSL Provisioning Fails:**

- Rollback: None (tenant can still use subdomain)
- Action: Alert merchant, provide manual DNS instructions

**MedusaJS Initialization Fails:**

- Rollback: Delete Cloud Run service, database, secrets
- Action: Check logs, retry initialization

### Rollback Implementation

```typescript
async function rollbackTenantProvisioning(tenantId: string) {
  // 1. Delete Cloud Run service
  await deleteCloudRunService(tenantId);

  // 2. Delete database
  await deleteNeonDatabase(tenantId);

  // 3. Delete secrets
  await deleteSecrets(tenantId);

  // 4. Remove custom hostname (if added)
  await removeCustomHostname(tenantId);

  // 5. Update tenant status to 'failed'
  await updateTenantStatus(tenantId, "failed");
}
```

## Tenant Deletion Workflow

When a tenant is deleted (suspended or permanently removed):

### Step 1: Soft Delete (Suspension)

```typescript
// Update tenant status
UPDATE tenants
SET
  status = 'suspended',
  suspended_at = NOW()
WHERE id = '${TENANT_ID}'
```

**Actions:**

- Stop accepting new requests (storefront should return suspended page)
- Keep infrastructure running (for data recovery)
- Optionally scale Cloud Run to 0 instances

### Step 2: Hard Delete (Permanent Removal)

```bash
# 1. Delete Cloud Run service
gcloud run services delete tenant-${TENANT_ID} \
  --project=vendin-store \
  --region=southamerica-east1 \
  --quiet

# 2. Delete database (via Neon API)
DELETE https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}
Authorization: Bearer {neon_api_key}

# 3. Delete secrets
gcloud secrets delete tenant-${TENANT_ID}-db-url \
  --project=vendin-store \
  --quiet

# 4. Remove custom hostname (if exists)
DELETE https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames/{hostname_id}
Authorization: Bearer {cloudflare_api_token}

# 5. Update tenant status
UPDATE tenants
SET
  status = 'deleted',
  deleted_at = NOW()
WHERE id = '${TENANT_ID}'
```

## Monitoring and Alerting

### Key Metrics to Track

**Provisioning Metrics:**

- Provisioning time (target: < 2 minutes)
- Success rate (target: > 99%)
- Failure rate by step
- Average time per provisioning step

**Tenant Health Metrics:**

- Active tenant count
- Idle tenant count (scale-to-zero)
- Failed tenant count
- Average response time per tenant

### Alerts

**Critical Alerts:**

- Provisioning failure rate > 5%
- Provisioning time > 3 minutes
- Database creation failures
- Cloud Run service creation failures

**Warning Alerts:**

- Provisioning time > 2 minutes
- SSL provisioning taking > 1 hour
- High rollback rate

## Testing Provisioning

### Manual Testing

```bash
# 1. Create test tenant via Control Plane API
curl -X POST https://control.vendin.store/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "merchantEmail": "test@example.com",
    "storeName": "Test Store",
    "plan": "starter"
  }'

# 2. Monitor provisioning status
curl https://control.vendin.store/api/tenants/${TENANT_ID}

# 3. Verify tenant instance is running
curl https://tenant-${TENANT_ID}-xxx.a.run.app/health

# 4. Test admin access
curl https://tenant-${TENANT_ID}-xxx.a.run.app/admin

# 5. Test store API
curl https://tenant-${TENANT_ID}-xxx.a.run.app/store/products
```

### Automated Testing

```typescript
// Integration test for provisioning
describe("Tenant Provisioning", () => {
  it("should provision tenant in under 2 minutes", async () => {
    const startTime = Date.now();

    const tenant = await createTenant({
      merchantEmail: "test@example.com",
      storeName: "Test Store",
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(120000); // 2 minutes

    expect(tenant.status).toBe("active");
    expect(tenant.databaseUrl).toBeDefined();
    expect(tenant.apiUrl).toBeDefined();
  });

  it("should rollback on failure", async () => {
    // Simulate failure
    // Verify rollback occurred
  });
});
```

## Performance Optimization

### Parallel Operations

Some provisioning steps can run in parallel:

```typescript
// Parallel execution
const [database, cloudRunService] = await Promise.all([
  createNeonDatabase(tenantId),
  createCloudRunService(tenantId),
]);

// Then configure secrets (depends on database)
await createSecrets(tenantId, database.connectionString);
```

### Caching

Cache frequently accessed data:

- Tenant metadata (in Control Plane)
- Cloud Run service URLs
- Custom hostname mappings

### Connection Pooling

Use connection pooling for:

- Database connections (Neon)
- Redis connections (Upstash)
- API clients (Cloudflare, GCP)

## Security Considerations

### Secrets Management

- Never log connection strings
- Rotate secrets periodically
- Use least-privilege access
- Encrypt secrets at rest

### Tenant Isolation

- Verify database isolation (one DB per tenant)
- Verify Cloud Run service isolation
- Verify Redis namespace isolation
- Audit cross-tenant access attempts

### API Security

- Authenticate all provisioning requests
- Rate limit provisioning API
- Validate input data
- Sanitize tenant IDs

## Troubleshooting

### Common Issues

1. **Provisioning Timeout**
   - Check Neon API rate limits
   - Verify GCP quotas
   - Check Cloudflare API status
   - Review logs for bottlenecks

2. **Database Creation Fails**
   - Verify Neon API credentials
   - Check Neon project limits
   - Verify region availability

3. **Cloud Run Service Creation Fails**
   - Check GCP quotas
   - Verify service account permissions
   - Check container image exists
   - Verify region availability

4. **SSL Certificate Not Provisioning**
   - Verify DNS CNAME is correct
   - Check custom hostname status
   - Wait up to 24 hours
   - Verify fallback origin

5. **MedusaJS Initialization Fails**
   - Check database connectivity
   - Verify database schema
   - Check tenant instance logs
   - Verify environment variables

## Next Steps

1. Implement provisioning logic in Control Plane
2. Set up monitoring and alerting
3. Create automated tests
4. Document API endpoints
5. Set up rollback procedures
6. Configure rate limiting
7. Implement tenant deletion workflow
