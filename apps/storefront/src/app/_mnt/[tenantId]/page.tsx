import { headers } from "next/headers";

export default async function TenantHomePage(properties: {
  params: { tenantId: string };
}) {
  // In Next.js 15+, params is a promise in the async component
  const { tenantId } = await properties.params;

  // Example of accessing headers set by middleware
  const headersList = await headers();
  const tenantUrl = headersList.get("x-tenant-url");

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Hello World</h1>
      <p className="mb-2">
        You have reached the storefront for Tenant ID:{" "}
        <code className="bg-gray-100 p-1 rounded">{tenantId}</code>
      </p>
      <p>
        Backend URL:{" "}
        <code className="bg-gray-100 p-1 rounded">{tenantUrl}</code>
      </p>
    </div>
  );
}
