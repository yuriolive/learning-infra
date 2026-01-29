import validator from "validator";
import { z } from "zod";

/**
 * Validates if a string is a valid subdomain/domain part.
 * Uses validator.isFQDN internally for robust validation.
 */
export const isSubdomain = (value: string): boolean => {
  return validator.isFQDN(value, {
    require_tld: false,
    allow_underscores: false,
    allow_trailing_dot: false,
  });
};

/**
 * Zod schema for subdomain validation.
 */
export const subdomainSchema = z
  .string()
  .refine(isSubdomain, "Invalid domain format");
