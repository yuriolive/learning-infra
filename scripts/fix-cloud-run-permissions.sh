#!/bin/bash
# Fix Cloud Run Deployment Permissions
# This script grants the necessary IAM roles to the GitHub Actions service account
# for deploying to Cloud Run.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Fix Cloud Run Deployment Permissions ===${NC}\n"

# Check if required variables are set
if [ -z "$PROJECT_ID" ]; then
  echo -e "${YELLOW}PROJECT_ID not set. Using default: vendin-store${NC}"
  PROJECT_ID="vendin-store"
fi

if [ -z "$SERVICE_ACCOUNT_EMAIL" ]; then
  echo -e "${RED}Error: SERVICE_ACCOUNT_EMAIL is required${NC}"
  echo "Usage: PROJECT_ID=your-project SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com $0"
  echo ""
  echo "To get the service account email from GitHub secrets:"
  echo "1. Go to your GitHub repository → Settings → Secrets and variables → Actions"
  echo "2. Find the value of GCP_WIF_SERVICE_ACCOUNT secret"
  echo "3. Use that value as SERVICE_ACCOUNT_EMAIL"
  exit 1
fi

echo "Project ID: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""

# Grant Cloud Run Admin role
echo -e "${GREEN}Granting roles/run.admin...${NC}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin" \
  --condition=None \
  --quiet || {
  echo -e "${YELLOW}Warning: roles/run.admin may already be granted${NC}"
}

# Grant Secret Manager Secret Accessor role (if not already granted)
echo -e "${GREEN}Granting roles/secretmanager.secretAccessor...${NC}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None \
  --quiet || {
  echo -e "${YELLOW}Warning: roles/secretmanager.secretAccessor may already be granted${NC}"
}

echo ""
echo -e "${GREEN}=== Verifying IAM Bindings ===${NC}\n"

# Verify permissions
echo "Current IAM bindings for $SERVICE_ACCOUNT_EMAIL:"
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --format="table(bindings.role)" || {
  echo -e "${RED}Error: Could not verify IAM bindings${NC}"
  exit 1
}

echo ""
echo -e "${GREEN}✓ Permissions granted successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Re-run the failed GitHub Actions workflow"
echo "2. Or push a new commit to trigger deployment"
echo ""
echo "To test the deployment, you can re-run the workflow from:"
echo "  https://github.com/yuriolive/learning-infra/actions"
