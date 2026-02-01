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

/* eslint-disable no-console */
export const consoleLogger: Logger = {
  info: (object, message) =>
    console.log(
      JSON.stringify({
        level: "info",
        message,
        ...(object as object),
      }),
    ),
  error: (object, message) =>
    console.error(
      JSON.stringify({
        level: "error",
        message,
        ...(object as object),
      }),
    ),
  warn: (object, message) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        ...(object as object),
      }),
    ),
  debug: (object, message) =>
    console.debug(
      JSON.stringify({
        level: "debug",
        message,
        ...(object as object),
      }),
    ),
};
/* eslint-enable no-console */

export const createLogger = (_options: LoggerOptions = {}): Logger => {
  return consoleLogger;
};
