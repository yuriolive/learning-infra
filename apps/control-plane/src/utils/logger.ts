export interface Logger {
  info: (object: object | unknown, message?: string) => void;
  error: (object: object | unknown, message?: string) => void;
  warn: (object: object | unknown, message?: string) => void;
  debug: (object: object | unknown, message?: string) => void;
}

export interface LoggerOptions {
  logLevel?: string | undefined;
  nodeEnv?: string;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);

      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cause: (value as any).cause,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(value as any),
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
  return JSON.stringify(
    {
      level,
      message,
      ...(object as object),
    },
    getCircularReplacer(),
  );
};

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

export const createLogger = (options: LoggerOptions = {}): Logger => {
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
    info: (object, message) => {
      if (shouldLog("info")) consoleLogger.info(object, message);
    },
    error: (object, message) => {
      if (shouldLog("error")) consoleLogger.error(object, message);
    },
    warn: (object, message) => {
      if (shouldLog("warn")) consoleLogger.warn(object, message);
    },
    debug: (object, message) => {
      if (shouldLog("debug")) consoleLogger.debug(object, message);
    },
  };
};
