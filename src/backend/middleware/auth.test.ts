import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
// import { getCurrentTenantId } from '../db.js'; // Not yet exported — multi-tenant deferred
import { authenticate, authorize } from './auth.js';

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  getHeader: ReturnType<typeof vi.fn>;
};

function createMockResponse(): MockResponse {
  const res = {} as MockResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.getHeader = vi.fn().mockReturnValue(undefined);
  return res;
}

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string);
}

describe('auth middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
  });

  // Multi-tenant tests — deferred until tenant isolation milestone
  it.skip('rejects token missing tenant context', () => {
    const token = signToken({
      userId: 'u1',
      email: 'test@example.com',
      role: 'admin',
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Token missing tenant context',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.skip('binds tenant context and calls next for valid token', () => {
    const tenantId = '22222222-2222-2222-2222-222222222222';
    const token = signToken({
      userId: 'u2',
      email: 'test@example.com',
      role: 'admin',
      tenantId,
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn(() => {
      expect(req.user?.tenantId).toBe(tenantId);
      // expect(getCurrentTenantId()).toBe(tenantId); // Requires multi-tenant impl
    }) as unknown as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('authorize returns 401 when user is missing', () => {
    const req = {} as Request;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('authorize returns 403 for disallowed role', () => {
    const req = {
      user: {
        userId: 'u3',
        email: 'viewer@example.com',
        role: 'viewer',
        tenantId: '33333333-3333-3333-3333-333333333333',
      },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn() as unknown as NextFunction;

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
