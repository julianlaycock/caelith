import { describe, it, expect } from 'vitest';
import { TEST_ASSETS, TEST_INVESTORS, TEST_RULES } from '../fixtures/test-data';
import { api, ensureAuth } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

describe('Happy Path: Full Workflow', () => {
  // Use unique suffix to avoid collisions with seed data or previous test runs
  const RUN = Date.now().toString(36);
  let assetId: string;
  let aliceId: string;
  let bobId: string;
  let charlieId: string;
  let dianaId: string;
  let eveId: string;

// ── Step 0: Authenticate ──────────────────────────────────

  it('should authenticate before running tests', async () => {
    await ensureAuth();
    expect(true).toBe(true);
  });

  // ── Step 1: Create Asset ──────────────────────────────

  it('should create an asset with 1,000,000 units', async () => {
    const assetData = { ...TEST_ASSETS.growthFund, name: `Growth Fund I ${RUN}` };
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });

    expect(asset.id).toBeDefined();
    expect(asset.name).toBe(`Growth Fund I ${RUN}`);
    expect(asset.total_units).toBe(1000000);
    assetId = asset.id;
  });

  // ── Step 2: Register 5 Investors ──────────────────────

  it('should register 5 investors', async () => {
    const mkInv = (base: Record<string, unknown>) => ({ ...base, name: `${base.name} ${RUN}` });

    const alice = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify(mkInv(TEST_INVESTORS.alice)),
    });
    aliceId = alice.id;
    expect(alice.name).toBe(`Alice Johnson ${RUN}`);

    const bob = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify(mkInv(TEST_INVESTORS.bob)),
    });
    bobId = bob.id;

    const charlie = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify(mkInv(TEST_INVESTORS.charlie)),
    });
    charlieId = charlie.id;

    const diana = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify(mkInv(TEST_INVESTORS.diana)),
    });
    dianaId = diana.id;

    const eve = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify(mkInv(TEST_INVESTORS.eve)),
    });
    eveId = eve.id;

    // Verify all 5 exist
    const investors = await api<CreatedEntity[]>('/investors');
    const createdNames = [alice, bob, charlie, diana, eve].map((i) => i.name);
    for (const name of createdNames) {
      expect(investors.some((i) => i.name === name)).toBe(true);
    }
  });

  // ── Step 3: Allocate Units to 5 Investors ─────────────

  it('should allocate units to 5 investors', async () => {
    const allocations = [
      { investor_id: () => aliceId, units: 300000 },
      { investor_id: () => bobId, units: 200000 },
      { investor_id: () => charlieId, units: 100000 },
      { investor_id: () => dianaId, units: 150000 },
      { investor_id: () => eveId, units: 50000 },
    ];

    for (const alloc of allocations) {
      const holding = await api<CreatedEntity>('/holdings', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          investor_id: alloc.investor_id(),
          units: alloc.units,
          acquired_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      expect(holding.id).toBeDefined();
    }

    // Verify cap table
    const capTable = await api<{ investor_name: string; units: number; percentage: number }[]>(
      `/holdings/cap-table/${assetId}`
    );
    expect(capTable.length).toBe(5);

    const totalAllocated = capTable.reduce((sum, entry) => sum + entry.units, 0);
    expect(totalAllocated).toBe(800000);
  });

  // ── Step 4: Configure Rules ───────────────────────────

  it('should create a 4-rule constraint set', async () => {
    const rules = await api<CreatedEntity>('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        ...TEST_RULES.standard,
      }),
    });

    expect(rules.id).toBeDefined();

    // Verify rules are retrievable
    const fetched = await api<Record<string, unknown>>(`/rules/${assetId}`);
    expect(fetched.qualification_required).toBe(true);
    expect(fetched.lockup_days).toBe(90);
    expect(fetched.jurisdiction_whitelist).toContain('US');
    expect(fetched.jurisdiction_whitelist).toContain('GB');
    expect(fetched.transfer_whitelist).toBeNull();
  });

  // ── Step 5: Asset Utilization ─────────────────────────

  it('should report correct utilization', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const util = await api<Record<string, any>>(`/assets/${assetId}/utilization`);
    
    expect(util.asset.total_units).toBe(1000000);
    expect(util.allocated_units).toBe(800000);
    expect(util.available_units).toBe(200000);
  });

  // ── Step 6: Simulate Valid Transfer ───────────────────

  it('should simulate a valid transfer (Alice → Bob)', async () => {
    const result = await api<{ valid: boolean; violations: string[] }>(
      '/transfers/simulate',
      {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          from_investor_id: aliceId,
          to_investor_id: bobId,
          units: 50000,
          execution_date: new Date().toISOString(),
        }),
      }
    );

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  // ── Step 7: Execute Valid Transfer ────────────────────

  it('should execute a valid transfer (Alice → Bob, 5,000 units)', async () => {
    // Use 5000 units to stay below the TRANSFER_APPROVAL_THRESHOLD (default 10000)
    const transfer = await api<CreatedEntity>('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: aliceId,
        to_investor_id: bobId,
        units: 5000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(transfer.id).toBeDefined();

    // Verify cap table updated
    const capTable = await api<{ investor_name: string; units: number }[]>(
      `/holdings/cap-table/${assetId}`
    );
    const alice = capTable.find((e) => e.investor_name === `Alice Johnson ${RUN}`);
    const bob = capTable.find((e) => e.investor_name === `Bob Smith ${RUN}`);
    expect(alice?.units).toBe(295000);
    expect(bob?.units).toBe(205000);
  });

  // ── Step 8: Transfer History ──────────────────────────

  it('should show transfer in history', async () => {
    const history = await api<{
      from_name: string;
      to_name: string;
      units: number;
    }[]>(
      `/transfers/history/${assetId}`
    );

    expect(history.length).toBeGreaterThanOrEqual(1);
    const latest = history[0];
    expect(latest.from_name).toBe(`Alice Johnson ${RUN}`);
    expect(latest.to_name).toBe(`Bob Smith ${RUN}`);
    expect(latest.units).toBe(5000);
  });

  // ── Step 9: Verify Cap Table Accuracy ─────────────────

  it('should have accurate final cap table', async () => {
    const capTable = await api<{ investor_name: string; units: number; percentage: number }[]>(
      `/holdings/cap-table/${assetId}`
    );

    const expected: Record<string, number> = {
      [`Alice Johnson ${RUN}`]: 295000,
      [`Bob Smith ${RUN}`]: 205000,
      [`Charlie Wang ${RUN}`]: 100000,
      [`Diana Mueller ${RUN}`]: 150000,
      [`Eve Tanaka ${RUN}`]: 50000,
    };

    for (const entry of capTable) {
      if (expected[entry.investor_name] !== undefined) {
        expect(entry.units).toBe(expected[entry.investor_name]);
      }
    }

    const totalAllocated = capTable
      .filter(e => expected[e.investor_name] !== undefined)
      .reduce((sum, e) => sum + e.units, 0);
    expect(totalAllocated).toBe(800000);
  });
});
