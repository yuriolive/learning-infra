// Hostname Resolution Pattern
// Subdomain Pattern: {store}-my.vendin.store
if (hostname.endsWith('-my.vendin.store')) {
  const storeName = hostname.replace('-my.vendin.store', '');
  
  // Check reserved subdomains
  const reserved = ['www', 'control', 'admin', 'mail', 'ftp'];
  if (reserved.includes(storeName)) {
    return null; // Not a tenant
  }
  
  // Query Control Plane to find tenant
  const tenant = await controlPlaneClient.findTenantBySubdomain(storeName);
  return tenant;
}

// Custom Domain Pattern
const tenant = await controlPlaneClient.findTenantByCustomDomain(hostname);
return tenant;

// Root Domain
if (hostname === 'vendin.store' || hostname === 'www.vendin.store') {
  // Serve landing page, signup form, marketing content
  return <LandingPage />;
}

// Tenant Store Routing
const tenant = await resolveTenantFromHostname(hostname);

if (!tenant) {
  // Unknown hostname, redirect to landing page
  return redirect('https://vendin.store');
}

if (tenant.status !== 'active') {
  // Tenant suspended or deleted
  return <SuspendedPage />;
}

// Route to tenant instance
const tenantUrl = `https://tenant-${tenant.id}-xxx.a.run.app`;
return proxyToTenant(tenantUrl, request);

// Middleware Pattern (Next.js)
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Root domain: Landing page
  if (hostname === 'vendin.store' || hostname === 'www.vendin.store') {
    return NextResponse.next();
  }
  
  // Resolve tenant
  const tenant = await resolveTenantFromHostname(hostname);
  
  if (!tenant) {
    return NextResponse.redirect('https://vendin.store');
  }
  
  // Add tenant context to request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-url', tenant.apiUrl);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
