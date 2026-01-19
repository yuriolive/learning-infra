import pino from "pino";

export interface LoggerOptions {
  logLevel?: string | undefined;
  nodeEnv?: string;
}

export const createLogger = (options: LoggerOptions = {}) => {
  const nodeEnvironment = options.nodeEnv ?? "development";
  const isDevelopment = nodeEnvironment !== "production";

  return pino({
    base: null,
    level: options.logLevel ?? (isDevelopment ? "debug" : "info"),
    ...(isDevelopment
      ? {
          transport: {
            options: {
              colorize: true,
              singleLine: true,
              translateTime: "SYS:standard",
            },
            target: "pino-pretty",
          },
        }
      : {}),
  });
};

export const logger = createLogger();

export type Logger = ReturnType<typeof createLogger>;
