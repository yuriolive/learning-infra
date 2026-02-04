import { consoleLogger, type Logger } from "./logger-cloudflare";

export interface LoggerOptions {
  logLevel?: string | undefined;
  nodeEnv?: string;
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const getLevelPriority = (level: string): number => {
  switch (level) {
    case "debug": {
      return 0;
    }
    case "info": {
      return 1;
    }
    case "warn": {
      return 2;
    }
    case "error": {
      return 3;
    }
    default: {
      return 1;
    }
  }
};

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

  const minLevelPriority = getLevelPriority(
    options.logLevel &&
      Object.prototype.hasOwnProperty.call(LOG_LEVELS, options.logLevel)
      ? options.logLevel
      : defaultLevel,
  );

  const shouldLog = (level: LogLevel) => {
    // eslint-disable-next-line security/detect-object-injection -- level is strictly typed as LogLevel
    return LOG_LEVELS[level] >= minLevelPriority;
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

export { consoleLogger } from "./logger-cloudflare";
