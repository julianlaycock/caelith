/**
 * Security Middleware
 * 
 * Rate limiting, security headers, and input sanitization.
 */

import { Request, Response, NextFunction } from 'express';
import { execute, query } from '../db.js';

// ─── Security Headers ─────────────────────────────────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires inline scripts
      "style-src 'self' 'unsafe-inline'",                  // Tailwind requires inline styles
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  res.removeHeader('X-Powered-By');

  next();
}

// ─── Rate Limiter ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let dbStoreInitialized = false;
let dbStoreInitPromise: Promise<void> | null = null;

/**
 * Clear all rate limit entries (used by test reset endpoint)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
  if (shouldUseSharedRateLimitStore()) {
    void execute('DELETE FROM rate_limit_counters').catch(() => {});
  }
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

function defaultRateLimitKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function shouldUseSharedRateLimitStore(): boolean {
  const configured = (process.env.RATE_LIMIT_STORE || '').toLowerCase();
  if (configured === 'memory') return false;
  if (configured === 'database' || configured === 'db') return true;
  return process.env.NODE_ENV === 'production';
}

async function ensureDbRateLimitStore(): Promise<void> {
  if (dbStoreInitialized) return;

  if (!dbStoreInitPromise) {
    dbStoreInitPromise = execute(
      `CREATE TABLE IF NOT EXISTS rate_limit_counters (
        rate_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    ).then(() => {
      dbStoreInitialized = true;
    }).finally(() => {
      dbStoreInitPromise = null;
    });
  }

  await dbStoreInitPromise;
}

function consumeFromMemoryStore(key: string, windowMs: number, nowMs: number): { count: number; resetAtMs: number } {
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= nowMs) {
    const resetAtMs = nowMs + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt: resetAtMs });
    return { count: 1, resetAtMs };
  }

  entry.count += 1;
  return { count: entry.count, resetAtMs: entry.resetAt };
}

async function consumeFromDbStore(key: string, windowMs: number): Promise<{ count: number; resetAtMs: number }> {
  await ensureDbRateLimitStore();

  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs).toISOString();

  const rows = await query<{ count: number; reset_epoch: number }>(
    `INSERT INTO rate_limit_counters (rate_key, count, reset_at, updated_at)
     VALUES (?, 1, ?, now())
     ON CONFLICT (rate_key) DO UPDATE
     SET count = CASE
          WHEN rate_limit_counters.reset_at <= now() THEN 1
          ELSE rate_limit_counters.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_counters.reset_at <= now() THEN EXCLUDED.reset_at
          ELSE rate_limit_counters.reset_at
        END,
        updated_at = now()
     RETURNING count, EXTRACT(EPOCH FROM reset_at)::bigint AS reset_epoch`,
    [key, resetAt]
  );

  const row = rows[0];
  const resetAtMs = row ? Number(row.reset_epoch) * 1000 : now.getTime() + windowMs;
  const count = row ? Number(row.count) : 1;
  return { count, resetAtMs };
}

export function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultRateLimitKeyGenerator,
    message = 'Too many requests, please try again later.',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator(req);
    const nowMs = Date.now();
    let count = 1;
    let resetAtMs = nowMs + windowMs;

    const useSharedStore = shouldUseSharedRateLimitStore();

    if (useSharedStore) {
      try {
        const sharedResult = await consumeFromDbStore(key, windowMs);
        count = sharedResult.count;
        resetAtMs = sharedResult.resetAtMs;
      } catch {
        const fallbackResult = consumeFromMemoryStore(key, windowMs, nowMs);
        count = fallbackResult.count;
        resetAtMs = fallbackResult.resetAtMs;
      }
    } else {
      const memoryResult = consumeFromMemoryStore(key, windowMs, nowMs);
      count = memoryResult.count;
      resetAtMs = memoryResult.resetAtMs;
    }

    const remaining = Math.max(0, maxRequests - count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAtMs / 1000)));

    if (count > maxRequests) {
      const retryAfter = Math.ceil((resetAtMs - nowMs) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter,
      });
      return;
    }

    next();
  };
}

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'production' ? 200 : 2000,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'production' ? 20 : 1000,
  message: 'Too many authentication attempts. Please try again later.',
});

export const exportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Export rate limit reached. Please wait before generating another report.',
});

// ─── Input Sanitization ───────────────────────────────────────

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query as Record<string, unknown>);
  }
  next();
}

function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string') {
      let sanitized = value.replace(/\0/g, '');
      sanitized = sanitized.trim();
      if (sanitized.length > 10240) {
        sanitized = sanitized.substring(0, 10240);
      }
      obj[key] = sanitized;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') {
          value[i] = item.replace(/\0/g, '').trim();
        }
      });
    }
  }
}
