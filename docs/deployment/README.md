# Deployment Documentation

This directory contains deployment and CD/CI documentation for the Learning Infrastructure project.

## Documents

### [CONTROL_PLANE.md](./CONTROL_PLANE.md)

Control Plane deployment to Google Cloud Run:

- CD pipeline configuration
- Cloud Run setup and scaling
- Service account permissions
- Local deployment guide
- Monitoring and troubleshooting

## Quick Reference

### Deployment Commands

```bash
# Deploy Control Plane
bun run deploy:control-plane

# View logs
gcloud run logs tail control-plane --region southamerica-east1

# View deployments
gcloud run services describe control-plane --region southamerica-east1
```

### Deployment Workflow

- **Trigger**: Push to `main` branch
- **Build**: Docker image via Artifact Registry
- **Deploy**: Cloud Run (`southamerica-east1`)
- **Scaling**: Min 0, auto-scale based on traffic

## Related Documentation

- [Cloud Run Infrastructure](../../.cursor/rules/infrastructure/cloud-run.mdc)
- [Control Plane API Development](../../.cursor/rules/apps/control-plane/api-development.mdc)
- [Test Architecture](../test/README.md)
