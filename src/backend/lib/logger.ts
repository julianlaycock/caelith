/**
 * Structured Logger
 *
 * JSON-formatted logging with contextual metadata.
 * Includes: timestamp, level, message, requestId, tenantId, and arbitrary context.
 * Designed for production observability (Sentry, Datadog, CloudWatch, etc.)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (): LogLevel => {
  const env = process.env.LOG_LEVEL as LogLevel | undefined;
  if (env && LOG_LEVELS[env] !== undefined) return env;
  return process.env.NODE_ENV === 'test' ? 'error' : 'info';
};

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  return JSON.stringify(entry);
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel()];
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) console.info(formatLog('debug', message, context));
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) console.info(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, context));
  },

  error(message: string, context?: LogContext & { error?: Error | unknown }): void {
    if (!shouldLog('error')) return;
    const ctx = { ...context };
    if (ctx.error instanceof Error) {
      ctx.errorMessage = ctx.error.message;
      ctx.errorStack = ctx.error.stack;
      delete ctx.error;
    }
    console.error(formatLog('error', message, ctx));
  },
};
