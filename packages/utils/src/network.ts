import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Checks if an IPv4 address is within a private or reserved range.
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  const p0 = Number.parseInt(parts[0]!, 10);
  const p1 = Number.parseInt(parts[1]!, 10);

  if (p0 === 10 || p0 === 127 || p0 === 0) {
    return true;
  }

  return (
    (p0 === 172 && p1 >= 16 && p1 <= 31) ||
    (p0 === 192 && p1 === 168) ||
    (p0 === 169 && p1 === 254)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const low = ip.toLowerCase();
  const isLoopbackOrUnspecified =
    low === "::1" ||
    low === "0:0:0:0:0:0:0:1" ||
    low === "::" ||
    low === "0:0:0:0:0:0:0:0";

  const isLocalRange =
    low.startsWith("fc") ||
    low.startsWith("fd") ||
    low.startsWith("fe8") ||
    low.startsWith("fe9") ||
    low.startsWith("fea") ||
    low.startsWith("feb");

  return isLoopbackOrUnspecified || isLocalRange;
}

/**
 * Checks if an IP address is within a private or reserved range.
 * Supports both IPv4 and IPv6.
 */
export function isPrivateIp(ip: string): boolean {
  const ipv4Result = isIP(ip);

  if (ipv4Result === 4) return isPrivateIpv4(ip);
  if (ipv4Result === 6) return isPrivateIpv6(ip);

  return true; // Not a valid IP, safer to treat as private/blocked
}

/**
 * Resolves all IP addresses for a given hostname.
 * Returns an empty array if the hostname cannot be resolved or is an IP itself.
 */
export async function resolveIps(hostname: string): Promise<string[]> {
  // If it's already an IP, return it in an array
  if (isIP(hostname)) {
    return [hostname];
  }

  try {
    // Resolve both IPv4 and IPv6
    const [ipv4, ipv6] = await Promise.all([
      dns.resolve4(hostname).catch(() => [] as string[]),
      dns.resolve6(hostname).catch(() => [] as string[]),
    ]);

    return [...ipv4, ...ipv6];
  } catch {
    return [];
  }
}
