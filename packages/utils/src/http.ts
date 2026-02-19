/**
 * Resolves the host from a request's headers, prioritizing 'x-forwarded-host'.
 *
 * @param headers - The request headers.
 * @returns The resolved host string, or an empty string if not found.
 */
export function resolveHost(
  headers: Headers | { get(name: string): string | null },
): string {
  return headers.get("x-forwarded-host") || headers.get("host") || "";
}

/**
 * Extracts and filters non-empty path parts from a URL or Request.
 *
 * @param source - The URL or Request object.
 * @returns An array of filtered path parts.
 */
export function getPathParts(source: URL | Request): string[] {
  const url = source instanceof Request ? new URL(source.url) : source;
  return url.pathname.split("/").filter(Boolean);
}
