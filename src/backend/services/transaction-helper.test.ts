/**
 * Unit tests for Transaction Helper
 *
 * Tests withTransaction and withTenantTransaction using mocked pg pool/client.
 * No real database connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the database module before importing the helpers ─────────────────────

// Create mock client with query/release methods
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

// Create mock pool with connect method
const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
};

// Mock the ../db.js module so getPool() returns our mock
vi.mock('../db.js', () => ({
  getPool: () => mockPool,
  DEFAULT_TENANT_ID: '00000000-0000-0000-0000-000000000099',
}));

// Now import the functions under test (after the mock is set up)
import { withTransaction, withTenantTransaction } from './transaction-helper.js';

// ── Test Helpers ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset query to resolve successfully by default
  mockClient.query.mockResolvedValue({ rows: [] });
});

// ── withTransaction Tests ─────────────────────────────────────────────────────

describe('withTransaction', () => {
  it('issues BEGIN, executes callback, then COMMIT', async () => {
    const callbackResult = { id: 'test-123' };
    const fn = vi.fn().mockResolvedValue(callbackResult);

    const result = await withTransaction(fn);

    expect(result).toEqual(callbackResult);

    // Verify the sequence of queries
    const queryCalls = mockClient.query.mock.calls.map(c => c[0]);
    expect(queryCalls[0]).toBe('BEGIN');
    expect(queryCalls[queryCalls.length - 1]).toBe('COMMIT');

    // Callback was called with the client
    expect(fn).toHaveBeenCalledWith(mockClient);

    // Client was released
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('issues ROLLBACK when callback throws', async () => {
    const error = new Error('Something went wrong');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withTransaction(fn)).rejects.toThrow('Something went wrong');

    const queryCalls = mockClient.query.mock.calls.map(c => c[0]);
    expect(queryCalls[0]).toBe('BEGIN');
    expect(queryCalls).toContain('ROLLBACK');
    expect(queryCalls).not.toContain('COMMIT');

    // Client was still released
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('releases client even if ROLLBACK fails', async () => {
    const error = new Error('Callback failed');
    const fn = vi.fn().mockRejectedValue(error);

    // Make ROLLBACK also fail
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'ROLLBACK') throw new Error('ROLLBACK failed');
      return { rows: [] };
    });

    await expect(withTransaction(fn)).rejects.toThrow('Callback failed');

    // Client was still released despite ROLLBACK failure
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns the value from the callback', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await withTransaction(fn);
    expect(result).toBe(42);
  });
});

// ── withTenantTransaction Tests ───────────────────────────────────────────────

describe('withTenantTransaction', () => {
  it('calls set_config with the tenant ID after BEGIN', async () => {
    const fn = vi.fn().mockResolvedValue('done');

    await withTenantTransaction('tenant-abc', fn);

    const queryCalls = mockClient.query.mock.calls;

    // First call: BEGIN
    expect(queryCalls[0][0]).toBe('BEGIN');

    // Second call: set_config with tenant ID
    expect(queryCalls[1][0]).toBe("SELECT set_config('app.tenant_id', $1, true)");
    expect(queryCalls[1][1]).toEqual(['tenant-abc']);

    // Last call: COMMIT
    expect(queryCalls[queryCalls.length - 1][0]).toBe('COMMIT');
  });

  it('passes the client to the callback function', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    await withTenantTransaction('tenant-xyz', fn);

    expect(fn).toHaveBeenCalledWith(mockClient);
  });

  it('returns the value from the callback', async () => {
    const fn = vi.fn().mockResolvedValue({ count: 5 });
    const result = await withTenantTransaction('tenant-1', fn);
    expect(result).toEqual({ count: 5 });
  });

  it('issues ROLLBACK when callback throws', async () => {
    const error = new Error('DB insert failed');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withTenantTransaction('tenant-1', fn)).rejects.toThrow('DB insert failed');

    const queryCalls = mockClient.query.mock.calls.map(c => c[0]);
    expect(queryCalls).toContain('BEGIN');
    expect(queryCalls).toContain("SELECT set_config('app.tenant_id', $1, true)");
    expect(queryCalls).toContain('ROLLBACK');
    expect(queryCalls).not.toContain('COMMIT');
  });

  it('releases client after successful transaction', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    await withTenantTransaction('tenant-1', fn);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('releases client after failed transaction', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withTenantTransaction('tenant-1', fn)).rejects.toThrow();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('sets tenant context for each unique tenant ID', async () => {
    const fn = vi.fn().mockResolvedValue(null);

    await withTenantTransaction('tenant-aaa', fn);
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue({ rows: [] });

    await withTenantTransaction('tenant-bbb', fn);

    // Second transaction should have tenant-bbb
    const setConfigCall = mockClient.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('set_config')
    );
    expect(setConfigCall).toBeDefined();
    expect(setConfigCall![1]).toEqual(['tenant-bbb']);
  });
});
