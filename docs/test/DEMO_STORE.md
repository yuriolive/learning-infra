# Persistent Demo Store

The persistent demo store is a permanently available tenant environment in the staging environment. It is primarily used as the target for our smoke tests and E2E Playwright tests after staging deployments.

## Setup & Management

We have a dedicated GitHub Action workflow (`Manage Demo Store`) that allows team members to provision, seed, and reset the demo store.

### Provisioning

To create the demo store if it doesn't exist, trigger the "provision" action in the `Manage Demo Store` workflow. This creates a tenant named `Demo Store` on the `demo-store` domain and sets its `releaseChannelId` to `internal`.

```bash
# Locally
pnpm run staging:demo:provision
```

### Seeding

Once provisioned, it needs to be populated with initial data (categories, products). Run the "seed" action.

```bash
# Locally
pnpm run staging:demo:seed
```

This runs both the default Medusa seeding (which creates the sales channel and API keys) and a custom seed that inserts 10 demo products with variants.

### Resetting

If the demo store state gets corrupted by tests, use the "reset" action (currently an alias for seed, future-proofed for hard resets).

```bash
# Locally
pnpm run staging:demo:reset
```

## Automatic Upgrades

When a pull request is merged into the `main` branch, the `deploy-tenant-instance.yml` workflow is triggered. After successfully building and pushing the new Docker image, it triggers an **Upgrade Campaign** in the Control Plane specifically targeting the `internal` release channel.
Since the persistent demo store is assigned to the `internal` release channel, its Cloud Run service is automatically updated to the newest image tag seamlessly.

## Configuration file

The `.staging/demo-store.json` file is generated locally during the `provision` command. It contains the essential connectivity details (URLs, Database Connection Strings) and is included in `.gitignore` to prevent sensitive data exposure.

## Credentials

The demo store uses the same credentials generated during the standard Medusa seed. By default, it registers an admin email `admin@medusa-test.com` with the password `supersecret`.

> [!WARNING]
> The credentials above are for staging/demo use only. **Never use these credentials or hardcode them in production environments.**

### E2E Usage

E2E tests consume variables exported by the demo store configuration. Make sure to define `DEMO_STORE_URL` in your `.env` when running Playwright locally.
