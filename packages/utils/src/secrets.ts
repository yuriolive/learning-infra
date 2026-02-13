/**
 * Interface for Cloudflare Secret Binding.
 */
export interface SecretBinding {
  get(): Promise<string>;
}

/**
 * A secret can be a simple string or a Cloudflare SecretBinding.
 */
export type BoundSecret = string | SecretBinding;

/**
 * Resolves a secret that might be bound as a Cloudflare SecretBinding.
 *
 * @param secret - The secret to resolve (string or SecretBinding)
 * @returns The resolved secret value or undefined if the input was undefined
 */
export async function resolveSecret(
  secret: BoundSecret | undefined,
): Promise<string | undefined> {
  if (typeof secret === "object" && secret !== null && "get" in secret) {
    const value = await (secret as SecretBinding).get();
    return value;
  }
  return secret as string | undefined;
}
