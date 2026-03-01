import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { resolveTenant } from '../../src/lib/tenant-resolution';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';

const provider = new PactV3({
  consumer: 'storefront',
  provider: 'control-plane',
  dir: path.resolve(process.cwd(), '.pact/pacts'),
});

describe('Control Plane Contract Tests', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      // Need to override NODE_ENV to avoid the local test tenant short-circuit
      NODE_ENV: 'test',
      // We'll set CONTROL_PLANE_API_URL dynamically to the mock server url
      ADMIN_API_KEY: 'test-admin-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolves a hostname to a tenant', () => {
    const expectedResponse = {
      id: MatchersV3.string('tenant-123'),
      name: MatchersV3.string('Test Tenant'),
      subdomain: MatchersV3.string('test-store'),
      apiUrl: MatchersV3.string('https://backend.example.com'),
      metadata: MatchersV3.like({
        theme: {
          primaryColor: '#000000',
          fontFamily: 'Inter',
          logoUrl: '',
        },
      }),
    };

    provider
      .given('a tenant exists with subdomain test-store')
      .uponReceiving('a request to resolve the tenant hostname')
      .withRequest({
        method: 'GET',
        path: '/api/tenants',
        query: { subdomain: 'test-store' },
        headers: {
          Authorization: 'Bearer test-admin-key',
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: [expectedResponse],
      });

    return provider.executeTest(async (mockserver) => {
      process.env.CONTROL_PLANE_API_URL = mockserver.url;

      const tenant = await resolveTenant('test-store');

      expect(tenant).toBeDefined();
      expect(tenant?.id).toBe('tenant-123');
      expect(tenant?.subdomain).toBe('test-store');
      expect(tenant?.backendUrl).toBe('https://backend.example.com');
    });
  });
});
