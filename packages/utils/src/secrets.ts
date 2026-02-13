/**
 * Types for Cloudflare Secret Bindings
 * @see https://developers.cloudflare.com/workers/runtime-apis/environment-variables/#secrets
 */
export interface SecretBinding {
  get(): Promise<string>;
}

export type BoundSecret = string | SecretBinding;

/**
 * Resolves a secret that could be either a string or a Cloudflare SecretBinding.
 *
 * @param secret - The secret to resolve
 * @returns The resolved secret string or undefined
 */
export async function resolveSecret(
  secret: BoundSecret | undefined,
): Promise<string | undefined> {
  if (typeof secret === "object" && secret !== null && "get" in secret) {
    return (secret as SecretBinding).get();
  }
  return secret as string | undefined;
}
