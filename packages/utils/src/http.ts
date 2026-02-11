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
