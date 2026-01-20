// Tenant Isolation Testing Pattern
it('should maintain database isolation between tenants', async () => {
  const tenant1 = await createTenant({ name: 'Store 1' });
  const tenant2 = await createTenant({ name: 'Store 2' });
  
  // Verify different databases
  expect(tenant1.databaseUrl).not.toBe(tenant2.databaseUrl);
  
  // Verify data isolation
  await createProduct(tenant1.id, { name: 'Product 1' });
  const products = await getProducts(tenant2.id);
  expect(products).not.toContainEqual(expect.objectContaining({ name: 'Product 1' }));
});
