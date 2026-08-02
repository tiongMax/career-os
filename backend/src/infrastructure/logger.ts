import type { LoggerOptions } from "pino";

export function createLoggerOptions(
  level: string,
  pretty: boolean,
): LoggerOptions {
  return {
    level,
    ...(pretty
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              ignore: "pid,hostname",
              singleLine: true,
              translateTime: "HH:MM:ss.l",
            },
          },
        }
      : {}),
  };
}
