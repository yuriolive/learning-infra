// GCP Secret Manager Pattern
// Create secret
await gcpSecretManager.createSecret({
  name: `tenant-${tenantId}-db-url`,
  value: databaseConnectionString,
  labels: {
    environment: 'production',
    service: 'tenant-instance',
    tenantId: tenantId
  }
});

// Grant access to service account
await gcpSecretManager.addIamPolicyBinding({
  secret: `tenant-${tenantId}-db-url`,
  member: `serviceAccount:cloud-run-sa@vendin-store.iam.gserviceaccount.com`,
  role: 'roles/secretmanager.secretAccessor'
});
