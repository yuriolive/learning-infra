#!/bin/bash
# Control Plane Deployment Pattern
gcloud run deploy control-plane \
  --project=vendin-store \
  --region=southamerica-east1 \
  --image=southamerica-east1-docker.pkg.dev/vendin-store/containers/control-plane:latest \
  --min-instances=0 \
  --max-instances=10 \
  --cpu=1 \
  --memory=512Mi \
  --set-secrets=DATABASE_URL=control-plane-db-url:latest
