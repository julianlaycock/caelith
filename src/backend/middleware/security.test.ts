import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRateLimits, rateLimit, shouldUseSharedRateLimitStore } from './security.js';

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  setHeader: Response['setHeader'] & ReturnType<typeof vi.fn>;
  removeHeader: Response['removeHeader'] & ReturnType<typeof vi.fn>;
};

function createMockReq(ip = '127.0.0.1'): Request {
  return {
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function createMockRes(): MockResponse {
  const res = {} as MockResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res) as unknown as MockResponse['setHeader'];
  res.removeHeader = vi.fn() as unknown as MockResponse['removeHeader'];
  return res;
}

describe('rate limiter', () => {
  beforeEach(() => {
    clearRateLimits();
    process.env.NODE_ENV = 'test';
    process.env.RATE_LIMIT_STORE = 'memory';
  });

  it('uses memory store in test mode by default', () => {
    expect(shouldUseSharedRateLimitStore()).toBe(false);
  });

  it('blocks requests when limit is exceeded', async () => {
    const middleware = rateLimit({
      windowMs: 60_000,
      maxRequests: 2,
      keyGenerator: () => 'test-rate-key',
    });

    const req = createMockReq();
    const next = vi.fn() as unknown as NextFunction;

    const res1 = createMockRes();
    await middleware(req, res1, next);
    expect(next).toHaveBeenCalledTimes(1);

    const res2 = createMockRes();
    await middleware(req, res2, next);
    expect(next).toHaveBeenCalledTimes(2);

    const res3 = createMockRes();
    await middleware(req, res3, next);
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(res3.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'RATE_LIMIT_EXCEEDED',
      })
    );
  });
});
