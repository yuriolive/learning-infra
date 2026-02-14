import { consoleLogger, type Logger } from "./cloudflare-logger";
import { type LoggerOptions } from "./pino-logger";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Creates a logger for Cloudflare Workers environments.
 * Uses structured JSON logging compatible with Cloudflare's logging infrastructure.
 * For Node.js apps, use the Pino-based logger in ./logger.ts instead.
 */
export const createCloudflareLogger = (options: LoggerOptions = {}): Logger => {
  const nodeEnvironment =
    options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const defaultLevel: LogLevel =
    nodeEnvironment === "production" ? "info" : "debug";

  // Validate log level or fallback
  const level: LogLevel =
    options.logLevel &&
    Object.prototype.hasOwnProperty.call(LOG_LEVELS, options.logLevel)
      ? (options.logLevel as LogLevel)
      : defaultLevel;

  const minLevelPriority = LOG_LEVELS[level];

  const shouldLog = (targetLevel: LogLevel) => {
    return LOG_LEVELS[targetLevel] >= minLevelPriority;
  };

  return {
    info: (object: object | unknown, message?: string) => {
      if (shouldLog("info")) consoleLogger.info(object, message);
    },
    error: (object: object | unknown, message?: string) => {
      if (shouldLog("error")) consoleLogger.error(object, message);
    },
    warn: (object: object | unknown, message?: string) => {
      if (shouldLog("warn")) consoleLogger.warn(object, message);
    },
    debug: (object: object | unknown, message?: string) => {
      if (shouldLog("debug")) consoleLogger.debug(object, message);
    },
  };
};

// Re-export consoleLogger for testing
export { consoleLogger } from "./cloudflare-logger";
