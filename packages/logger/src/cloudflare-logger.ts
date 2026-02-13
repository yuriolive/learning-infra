/**
 * Logger interface compatible with both Pino and Cloudflare implementations
 */
export interface Logger {
  info: (object: object | unknown, message?: string) => void;
  error: (object: object | unknown, message?: string) => void;
  warn: (object: object | unknown, message?: string) => void;
  debug: (object: object | unknown, message?: string) => void;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);

      if (
        value instanceof Error ||
        (Object.prototype.hasOwnProperty.call(value, "message") &&
          Object.prototype.hasOwnProperty.call(value, "stack"))
      ) {
        return {
          name: (value as Error).name,
          message: (value as Error).message,
          stack: (value as Error).stack,
          cause: (value as { cause?: unknown }).cause,
          ...(value as Record<string, unknown>),
        };
      }
    }
    return value;
  };
};

const formatLog = (
  level: string,
  object: object | unknown,
  message?: string,
) => {
  const logObject =
    typeof object === "string"
      ? { level, message: object }
      : {
          level,
          message,
          ...(object as object),
        };

  return JSON.stringify(logObject, getCircularReplacer());
};

/**
 * Console-based logger for Cloudflare Workers.
 * Uses structured JSON logging compatible with Cloudflare's log aggregation.
 */
/* eslint-disable no-console */
export const consoleLogger: Logger = {
  info: (object, message) => console.log(formatLog("info", object, message)),
  error: (object, message) =>
    console.error(formatLog("error", object, message)),
  warn: (object, message) => console.warn(formatLog("warn", object, message)),
  debug: (object, message) =>
    console.debug(formatLog("debug", object, message)),
};
/* eslint-enable no-console */
