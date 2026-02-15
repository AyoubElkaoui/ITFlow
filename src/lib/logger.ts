/**
 * Structured logger for server-side code.
 *
 * In production, outputs JSON lines for easy parsing by log aggregators.
 * In development, outputs human-readable colored messages.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || "info"] ?? 1;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  if (IS_PRODUCTION) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    });
  }

  // Development: human-readable
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`;
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `${prefix} ${message}${ctx}`;
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const formatted = formatMessage(level, message, context);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log("debug", message, context),
  info: (message: string, context?: LogContext) =>
    log("info", message, context),
  warn: (message: string, context?: LogContext) =>
    log("warn", message, context),
  error: (message: string, context?: LogContext) =>
    log("error", message, context),
};
