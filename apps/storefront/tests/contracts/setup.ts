import { vi } from 'vitest';

vi.mock('react', () => ({
  cache: (fn: unknown) => fn,
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({ env: {} }),
}));
