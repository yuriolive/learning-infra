// Cloudflare for SaaS API Integration Pattern
// Add custom hostname for tenant
const response = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_hostnames`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hostname: 'shop.merchant.com',
      ssl: {
        method: 'http',
        type: 'dv',
      },
    }),
  }
);

// Poll for SSL status
await waitForSSLProvisioning(hostnameId);
