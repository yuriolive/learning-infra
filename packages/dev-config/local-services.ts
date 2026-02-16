// packages/dev-config/local-services.ts
export const localServices = {
  controlPlane: {
    url: process.env.CONTROL_PLANE_URL || 'http://localhost:8787',
    adminApiKey: process.env.ADMIN_API_KEY || 'dev-admin-key',
  },
  marketing: {
    url: process.env.MARKETING_URL || 'http://localhost:3000',
  },
  storefront: {
    url: process.env.STOREFRONT_URL || 'http://localhost:3001',
  },
  tenantInstance: {
    url: process.env.TENANT_INSTANCE_URL || 'http://localhost:9000',
  },
  database: {
    postgresUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/main',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  },
} as const;

export type LocalServicesConfig = typeof localServices;
