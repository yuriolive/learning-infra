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

/**
 * Resolves an environment variable or secret from a provided context or process.env.
 *
 * @param key - The name of the environment variable/secret to resolve
 * @param contextEnvironment - Optional environment object (e.g., from Cloudflare context)
 * @returns The resolved string value or undefined
 */
export async function resolveEnvironment(
  key: string,
  contextEnvironment?: Record<string, unknown>,
): Promise<string | undefined> {
  // 1. Try context/binding first
  if (contextEnvironment && key in contextEnvironment) {
    const value = contextEnvironment[key];
    return resolveSecret(value as BoundSecret);
  }

  // 2. Fallback to process.env
  // process might not be defined in some edge runtimes without node compatibility
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env[key] !== undefined
  ) {
    return resolveSecret(process.env[key] as BoundSecret);
  }

  return undefined;
}

/**
 * Resolves the Google Service Account JSON credentials.
 * Handles splitting the secret into 3 parts to work around environment variable size limits.
 *
 * Checks for:
 * 1. GOOGLE_APPLICATION_CREDENTIALS_PART_1 + _2 + _3
 * 2. GOOGLE_SERVICE_ACCOUNT_JSON (Legacy/Fallback)
 */
export async function resolveGoogleCredentials(
  contextEnvironment?: Record<string, unknown>,
): Promise<string | undefined> {
  const part1 = await resolveEnvironment(
    "GOOGLE_APPLICATION_CREDENTIALS_PART_1",
    contextEnvironment,
  );
  const part2 = await resolveEnvironment(
    "GOOGLE_APPLICATION_CREDENTIALS_PART_2",
    contextEnvironment,
  );
  const part3 = await resolveEnvironment(
    "GOOGLE_APPLICATION_CREDENTIALS_PART_3",
    contextEnvironment,
  );

  if (part1 && part2 && part3) {
    return part1 + part2 + part3;
  }

  return resolveEnvironment("GOOGLE_SERVICE_ACCOUNT_JSON", contextEnvironment);
}
