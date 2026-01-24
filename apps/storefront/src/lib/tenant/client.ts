import { Tenant } from "./types";

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_API_URL;
const API_KEY = process.env.CONTROL_PLANE_API_KEY;

export async function fetchTenantBySubdomain(
  subdomain: string,
): Promise<Tenant | null> {
  if (!CONTROL_PLANE_URL || !API_KEY) {
    console.error("Control Plane configuration missing");
    return null;
  }

  try {
    const response = await fetch(
      `${CONTROL_PLANE_URL}/api/tenants/lookup?subdomain=${subdomain}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        next: { revalidate: 300 }, // 5 minutes cache
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(
        `Failed to fetch tenant: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return null;
  }
}

export async function fetchTenantById(id: string): Promise<Tenant | null> {
  if (!CONTROL_PLANE_URL || !API_KEY) {
    console.error("Control Plane configuration missing");
    return null;
  }

  try {
    const response = await fetch(`${CONTROL_PLANE_URL}/api/tenants/${id}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      next: { revalidate: 300 }, // 5 minutes cache
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(
        `Failed to fetch tenant: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return null;
  }
}
