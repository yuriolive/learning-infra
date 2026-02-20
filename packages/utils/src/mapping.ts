/**
 * Maps an optional value (T | undefined | null) to a nullable value (T | null).
 * Useful for normalizing undefined values to null for database operations or API responses.
 *
 * @param value - The value to map
 * @returns The value, or null if it was null or undefined
 */
export function mapOptional<T>(value: T | undefined | null): T | null {
  return value ?? null;
}
