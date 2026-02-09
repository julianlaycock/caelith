import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query, execute, closeDb } from '../../src/backend/db.js';
import {
  createAsset,
  findAssetById,
  createInvestor,
  findInvestorById,
  createHolding,
  findHoldingByInvestorAndAsset,
  getCapTable,
  createRuleSet,
  findRuleSetByAsset,
  createTransfer,
  findTransferById,
  createEvent,
} from '../../src/backend/repositories/index.js';

async function cleanDb(): Promise<void> {
  await execute('DELETE FROM events');
  await execute('DELETE FROM transfers');
  await execute('DELETE FROM holdings');
  await execute('DELETE FROM rules');
  await execute('DELETE FROM investors');
  await execute('DELETE FROM assets');
}

describe('Repository Layer Tests', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterEach(async () => {
    await cleanDb();
  });

  describe('Test 1: Asset and Investor Creation', () => {
    it('should create an asset and investor, then verify retrieval', async () => {
      const asset = await createAsset({
        name: 'Test Fund LP',
        asset_type: 'Fund',
        total_units: 1000000,
      });

      expect(asset).toBeDefined();
      expect(asset.id).toBeTruthy();
      expect(asset.name).toBe('Test Fund LP');
      expect(asset.total_units).toBe(1000000);

      const retrievedAsset = await findAssetById(asset.id);
      expect(retrievedAsset).toBeDefined();
      expect(retrievedAsset?.id).toBe(asset.id);
      expect(retrievedAsset?.name).toBe('Test Fund LP');

      const investor = await createInvestor({
        name: 'Alice Johnson',
        jurisdiction: 'US',
        accredited: true,
      });

      expect(investor).toBeDefined();
      expect(investor.id).toBeTruthy();
      expect(investor.name).toBe('Alice Johnson');
      expect(investor.accredited).toBe(true);

      const retrievedInvestor = await findInvestorById(investor.id);
      expect(retrievedInvestor).toBeDefined();
      expect(retrievedInvestor?.id).toBe(investor.id);
      expect(retrievedInvestor?.accredited).toBe(true);
    });
  });

  describe('Test 2: Complete Transfer Workflow', () => {
    it('should create asset, investors, holdings, rules, execute transfer, and log events', async () => {
      const asset = await createAsset({
        name: 'Venture Fund I',
        asset_type: 'Fund',
        total_units: 10000,
      });

      const alice = await createInvestor({
        name: 'Alice (Seller)',
        jurisdiction: 'US',
        accredited: true,
      });

      const bob = await createInvestor({
        name: 'Bob (Buyer)',
        jurisdiction: 'US',
        accredited: true,
      });

      const now = new Date().toISOString();
      const aliceHolding = await createHolding({
        investor_id: alice.id,
        asset_id: asset.id,
        units: 5000,
        acquired_at: now,
      });

      expect(aliceHolding.units).toBe(5000);

      await createHolding({
        investor_id: bob.id,
        asset_id: asset.id,
        units: 0,
        acquired_at: now,
      });

      const rules = await createRuleSet({
        asset_id: asset.id,
        qualification_required: true,
        lockup_days: 0,
        jurisdiction_whitelist: ['US', 'UK'],
        transfer_whitelist: null,
      });

      expect(rules).toBeDefined();
      expect(rules.qualification_required).toBe(true);
      expect(rules.jurisdiction_whitelist).toEqual(['US', 'UK']);

      const retrievedRules = await findRuleSetByAsset(asset.id);
      expect(retrievedRules).toBeDefined();
      expect(retrievedRules?.lockup_days).toBe(0);

      const transfer = await createTransfer({
        asset_id: asset.id,
        from_investor_id: alice.id,
        to_investor_id: bob.id,
        units: 1000,
        executed_at: now,
      });

      expect(transfer).toBeDefined();
      expect(transfer.units).toBe(1000);

      const retrievedTransfer = await findTransferById(transfer.id);
      expect(retrievedTransfer).toBeDefined();
      expect(retrievedTransfer?.from_investor_id).toBe(alice.id);
      expect(retrievedTransfer?.to_investor_id).toBe(bob.id);

      const event = await createEvent({
        event_type: 'transfer.executed',
        entity_type: 'transfer',
        entity_id: transfer.id,
        payload: {
          asset_id: asset.id,
          from_investor_id: alice.id,
          to_investor_id: bob.id,
          units: 1000,
        },
      });

      expect(event).toBeDefined();
      expect(event.event_type).toBe('transfer.executed');
      expect(event.payload.units).toBe(1000);

      const updatedAliceHolding = await findHoldingByInvestorAndAsset(alice.id, asset.id);
      const updatedBobHolding = await findHoldingByInvestorAndAsset(bob.id, asset.id);

      expect(updatedAliceHolding?.units).toBe(5000);
      expect(updatedBobHolding?.units).toBe(0);

      const capTable = await getCapTable(asset.id);
      expect(capTable).toBeDefined();
      expect(capTable.length).toBe(1);
      expect(capTable[0].investor_name).toBe('Alice (Seller)');
      expect(capTable[0].units).toBe(5000);
      expect(capTable[0].percentage).toBe(50);
    });
  });
});