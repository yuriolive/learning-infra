import type { Logger } from "./cloudflare-logger.js";

/**
 * Minimal interface for the Medusa Logger to avoid hard dependency.
 */
export interface MedusaLogger {
  info(message: string): void;
  error(messageOrError: string | Error, error?: Error): void;
  warn(message: string): void;
  debug(message: string): void;
}

const format = (object: object | unknown, message?: string): string => {
  if (typeof object === "string")
    return message ? `${object} ${message}` : object;
  if (object instanceof Error) {
    return message ? `${message} ${object.message}` : object.message;
  }

  try {
    const stringified = JSON.stringify(object);
    return message ? `${message} ${stringified}` : stringified;
  } catch {
    return message
      ? `${message} [Unstringifiable Object]`
      : "[Unstringifiable Object]";
  }
};

/**
 * Adapts a Medusa-style Logger to the Vendin Logger interface.
 * Vendin Logger methods accept (object | unknown, message?) while Medusa's
 * Logger methods typically accept strings or Errors.
 */
export function toVendinLogger(logger: MedusaLogger): Logger {
  return {
    info: (object, message) => logger.info(format(object, message)),
    error: (object, message) => {
      if (object instanceof Error) {
        logger.error(object, message ? new Error(message) : undefined);
      } else {
        logger.error(format(object, message));
      }
    },
    warn: (object, message) => logger.warn(format(object, message)),
    debug: (object, message) => logger.debug(format(object, message)),
  };
}
