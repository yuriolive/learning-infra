// Provisioning Performance Testing Pattern
it('should provision tenant in under 2 minutes', async () => {
  const startTime = Date.now();
  const tenant = await provisionTenant({ merchantEmail: 'test@example.com' });
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(120000); // 2 minutes
  expect(tenant.status).toBe('active');
});
