import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import { execute } from '../../src/backend/db.js';
import { API_BASE } from '../fixtures/test-data';

interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

function signToken(tenantId: string, role: 'admin' | 'compliance_officer' | 'viewer', userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for multi-tenant tests');
  }
  return jwt.sign(
    {
      userId,
      email: `${userId}@caelith.test`,
      role,
      tenantId,
    },
    secret,
    { expiresIn: '1h' }
  );
}

async function apiWithToken<T = unknown>(
  path: string,
  token?: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  return { status: res.status, body: body as T };
}

describe('Multi-tenant security matrix', () => {
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const adminAToken = signToken(tenantA, 'admin', 'tenant-a-admin');
  const adminBToken = signToken(tenantB, 'admin', 'tenant-b-admin');
  const viewerAToken = signToken(tenantA, 'viewer', 'tenant-a-viewer');

  let tenantAAssetId = '';
  let tenantBAssetId = '';

  beforeAll(async () => {
    await execute(
      `INSERT INTO tenants (id, name, slug, status) VALUES (?, ?, ?, 'active') ON CONFLICT (id) DO NOTHING`,
      [tenantA, 'Security Tenant A', 'security-tenant-a']
    );
    await execute(
      `INSERT INTO tenants (id, name, slug, status) VALUES (?, ?, ?, 'active') ON CONFLICT (id) DO NOTHING`,
      [tenantB, 'Security Tenant B', 'security-tenant-b']
    );

    const createdA = await apiWithToken<{ id: string }>('/assets', adminAToken, {
      method: 'POST',
      body: JSON.stringify({
        name: `Tenant A Asset ${Date.now()}`,
        asset_type: 'Fund',
        total_units: 100000,
      }),
    });
    expect(createdA.status).toBe(201);
    tenantAAssetId = (createdA.body as { id: string }).id;

    const createdB = await apiWithToken<{ id: string }>('/assets', adminBToken, {
      method: 'POST',
      body: JSON.stringify({
        name: `Tenant B Asset ${Date.now()}`,
        asset_type: 'Fund',
        total_units: 120000,
      }),
    });
    expect(createdB.status).toBe(201);
    tenantBAssetId = (createdB.body as { id: string }).id;
  });

  it('returns 401 for protected endpoint without token', async () => {
    const response = await apiWithToken('/assets');
    expect(response.status).toBe(401);
  });

  it('enforces tenant isolation for resource reads and listings', async () => {
    const ownAsset = await apiWithToken<{ id: string }>(`/assets/${tenantAAssetId}`, adminAToken);
    expect(ownAsset.status).toBe(200);

    const crossTenantAsset = await apiWithToken(`/assets/${tenantAAssetId}`, adminBToken);
    expect(crossTenantAsset.status).toBe(404);

    const tenantAList = await apiWithToken<Array<{ id: string }>>('/assets', adminAToken);
    const tenantBList = await apiWithToken<Array<{ id: string }>>('/assets', adminBToken);
    expect(tenantAList.status).toBe(200);
    expect(tenantBList.status).toBe(200);

    const tenantAIds = new Set((tenantAList.body || []).map((row) => row.id));
    const tenantBIds = new Set((tenantBList.body || []).map((row) => row.id));

    expect(tenantAIds.has(tenantAAssetId)).toBe(true);
    expect(tenantAIds.has(tenantBAssetId)).toBe(false);
    expect(tenantBIds.has(tenantBAssetId)).toBe(true);
    expect(tenantBIds.has(tenantAAssetId)).toBe(false);
  });

  it('enforces role boundaries on privileged routes', async () => {
    const forbidden = await apiWithToken('/rules', viewerAToken, {
      method: 'POST',
      body: JSON.stringify({
        asset_id: tenantAAssetId,
        qualification_required: true,
        lockup_days: 30,
        jurisdiction_whitelist: ['US'],
        transfer_whitelist: null,
      }),
    });
    expect(forbidden.status).toBe(403);
  });
});
