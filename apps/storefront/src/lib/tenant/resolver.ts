export function extractSubdomainFromHostname(hostname: string): string | null {
  const ROOT_DOMAIN = "vendin.store";

  if (hostname === ROOT_DOMAIN) return null;
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null; // Custom domains not supported in MVP

  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, "");

  // Validate format: alphanumeric, hyphens, 3-63 chars (approx)
  // MVP: just alphanumeric and hyphens
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
    return null;
  }

  return subdomain;
}

export function shouldRedirectToMarketing(hostname: string): boolean {
  return hostname === "vendin.store";
}

export function isLocalhost(hostname: string): boolean {
  return hostname.includes("localhost");
}
