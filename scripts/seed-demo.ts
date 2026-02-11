/**
 * Seed Demo Data — Luxembourg SIF/RAIF workflow
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING where possible.
 * Imports directly from repositories (no HTTP server needed).
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query, execute, closeDb } from '../src/backend/db.js';

// ---------------------------------------------------------------------------
// Fixed UUIDs for predictable references
// ---------------------------------------------------------------------------
const SIF_ID  = '00000000-0000-0000-0000-000000000001';
const RAIF_ID = '00000000-0000-0000-0000-000000000002';

async function exists(table: string, id: string): Promise<boolean> {
  const rows = await query('SELECT 1 FROM ' + table + ' WHERE id = $1', [id]);
  return rows.length > 0;
}

async function seed() {
  console.log('Seeding demo data for Luxembourg SIF/RAIF workflow...\n');

  // =========================================================================
  // 0. Admin User
  // =========================================================================
  console.log('[Users]');
  const existingUser = await query('SELECT 1 FROM users WHERE email = $1', ['admin@caelith.dev']);
  if (existingUser.length > 0) {
    console.log('  → admin@caelith.dev already exists');
  } else {
    const passwordHash = await bcrypt.hash('admin1234', 10);
    await execute(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now())`,
      ['admin@caelith.dev', passwordHash, 'System Admin', 'admin']
    );
    console.log('  ✓ Created admin@caelith.dev (password: admin1234)');
  }

  // =========================================================================
  // 1. Fund Structures (fixed UUIDs — direct SQL)
  // =========================================================================
  console.log('[Fund Structures]');

  const funds = [
    { id: SIF_ID,  name: 'Luxembourg SIF Alpha', legal_form: 'SIF',  domicile: 'LU', framework: 'AIFMD' },
    { id: RAIF_ID, name: 'Luxembourg RAIF Beta',  legal_form: 'RAIF', domicile: 'LU', framework: 'AIFMD' },
  ];

  for (const f of funds) {
    if (await exists('fund_structures', f.id)) {
      console.log(`  → ${f.name} already exists`);
    } else {
      await execute(
        `INSERT INTO fund_structures
           (id, name, legal_form, domicile, regulatory_framework, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'EUR', 'active', now(), now())`,
        [f.id, f.name, f.legal_form, f.domicile, f.framework]
      );
      console.log(`  ✓ Created ${f.name}`);
    }
  }

  // =========================================================================
  // 2. Eligibility Criteria (amounts in cents)
  // =========================================================================
  console.log('\n[Eligibility Criteria]');

  const criteria = [
    { fs: SIF_ID,  type: 'professional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,  type: 'semi_professional',  min: 12500000, suit: true,  src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,  type: 'institutional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: RAIF_ID, type: 'professional',       min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID, type: 'semi_professional',  min: 12500000, suit: true,  src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID, type: 'institutional',      min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
  ];

  for (const c of criteria) {
    // Check if criteria already exists for this fund + type + jurisdiction
    const existing = await query(
      `SELECT 1 FROM eligibility_criteria
       WHERE fund_structure_id = $1 AND investor_type = $2 AND jurisdiction = '*' AND superseded_at IS NULL`,
      [c.fs, c.type]
    );
    if (existing.length > 0) {
      console.log(`  → ${c.type} for ${c.fs === SIF_ID ? 'SIF' : 'RAIF'} already exists`);
    } else {
      await execute(
        `INSERT INTO eligibility_criteria
           (id, fund_structure_id, jurisdiction, investor_type, minimum_investment,
            suitability_required, documentation_required, source_reference, effective_date, created_at)
         VALUES (gen_random_uuid(), $1, '*', $2, $3, $4, '[]', $5, CURRENT_DATE, now())`,
        [c.fs, c.type, c.min, c.suit, c.src]
      );
      console.log(`  ✓ Created ${c.type} criteria for ${c.fs === SIF_ID ? 'SIF' : 'RAIF'} (min: €${(c.min / 100).toLocaleString()})`);
    }
  }

  // =========================================================================
  // 3. Assets (linked to fund structures)
  // =========================================================================
  console.log('\n[Assets]');

  const assets = [
    { name: 'LU SIF Alpha - Class A', fs: SIF_ID,  type: 'Fund', units: 1000000, price: 1.0 },
    { name: 'LU SIF Alpha - Class B', fs: SIF_ID,  type: 'Fund', units: 500000,  price: 10.0 },
    { name: 'LU RAIF Beta - Class A', fs: RAIF_ID, type: 'Fund', units: 2000000, price: 1.0 },
  ];

  const assetIds: Record<string, string> = {};
  for (const a of assets) {
    const existing = await query<{ id: string }>(
      'SELECT id FROM assets WHERE name = $1',
      [a.name]
    );
    if (existing.length > 0) {
      assetIds[a.name] = existing[0].id;
      console.log(`  → ${a.name} already exists`);
    } else {
      const rows = await query<{ id: string }>(
        `INSERT INTO assets (id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now()) RETURNING id`,
        [a.name, a.type, a.units, a.fs, a.price]
      );
      assetIds[a.name] = rows[0].id;
      console.log(`  ✓ Created ${a.name} (${a.units.toLocaleString()} units @ €${a.price})`);
    }
  }

  const sifClassA  = assetIds['LU SIF Alpha - Class A'];
  const raifClassA = assetIds['LU RAIF Beta - Class A'];

  // =========================================================================
  // 4. Rules (permissive defaults, one per asset)
  // =========================================================================
  console.log('\n[Rules]');

  for (const [name, assetId] of Object.entries(assetIds)) {
    const existing = await query('SELECT 1 FROM rules WHERE asset_id = $1', [assetId]);
    if (existing.length > 0) {
      console.log(`  → Rules for ${name} already exist`);
    } else {
      await execute(
        `INSERT INTO rules
           (id, asset_id, version, qualification_required, lockup_days, jurisdiction_whitelist, transfer_whitelist, created_at)
         VALUES (gen_random_uuid(), $1, 1, false, 0, '[]', NULL, now())`,
        [assetId]
      );
      console.log(`  ✓ Created permissive rules for ${name}`);
    }
  }

  // =========================================================================
  // 5. Investors
  // =========================================================================
  console.log('\n[Investors]');

  const investors = [
    { name: 'Marie Laurent',          jur: 'FR', type: 'professional',      kyc: 'verified', expiry: '2027-12-31' },
    { name: 'Klaus Schmidt',          jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2026-05-15' },
    { name: 'Acme Capital Partners',  jur: 'LU', type: 'institutional',    kyc: 'verified', expiry: '2028-06-30' },
    { name: 'Sophie Dubois',          jur: 'FR', type: 'professional',      kyc: 'verified', expiry: '2027-03-15' },
    { name: 'Erik Nordström',         jur: 'NO', type: 'semi_professional', kyc: 'verified', expiry: '2026-11-20' },
    { name: 'Pieter van Dijk',        jur: 'NL', type: 'institutional',    kyc: 'verified', expiry: '2027-06-01' },
  ];

  const investorIds: Record<string, string> = {};
  for (const inv of investors) {
    const existing = await query<{ id: string }>(
      'SELECT id FROM investors WHERE name = $1',
      [inv.name]
    );
    if (existing.length > 0) {
      investorIds[inv.name] = existing[0].id;
      console.log(`  → ${inv.name} already exists`);
    } else {
      const rows = await query<{ id: string }>(
        `INSERT INTO investors
           (id, name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, created_at)
         VALUES (gen_random_uuid(), $1, $2, true, $3, $4, $5, now()) RETURNING id`,
        [inv.name, inv.jur, inv.type, inv.kyc, inv.expiry]
      );
      investorIds[inv.name] = rows[0].id;
      console.log(`  ✓ Created ${inv.name} (${inv.jur}, ${inv.type}, KYC expires ${inv.expiry})`);
    }
  }

  const marieId = investorIds['Marie Laurent'];
  const klausId = investorIds['Klaus Schmidt'];
  const acmeId  = investorIds['Acme Capital Partners'];
  const sophieId = investorIds['Sophie Dubois'];
  const erikId = investorIds['Erik Nordström'];
  const pieterId = investorIds['Pieter van Dijk'];

  // =========================================================================
  // 6. Holdings
  // =========================================================================
  console.log('\n[Holdings]');

  const holdings = [
    { inv: marieId, invName: 'Marie Laurent',         asset: sifClassA,  assetName: 'SIF Class A',  units: 200000 },
    { inv: klausId, invName: 'Klaus Schmidt',          asset: sifClassA,  assetName: 'SIF Class A',  units: 150000 },
    { inv: acmeId,  invName: 'Acme Capital Partners',  asset: sifClassA,  assetName: 'SIF Class A',  units: 400000 },
    { inv: acmeId,  invName: 'Acme Capital Partners',  asset: raifClassA, assetName: 'RAIF Class A', units: 500000 },
    { inv: sophieId, invName: 'Sophie Dubois',     asset: raifClassA, assetName: 'RAIF Class A', units: 300000 },
    { inv: erikId,   invName: 'Erik Nordström',    asset: sifClassA,  assetName: 'SIF Class A',  units: 100000 },
    { inv: pieterId, invName: 'Pieter van Dijk',   asset: raifClassA, assetName: 'RAIF Class A', units: 600000 },
  ];

  for (const h of holdings) {
    const existing = await query(
      'SELECT 1 FROM holdings WHERE investor_id = $1 AND asset_id = $2',
      [h.inv, h.asset]
    );
    if (existing.length > 0) {
      console.log(`  → ${h.invName} → ${h.assetName} already exists`);
    } else {
      await execute(
        `INSERT INTO holdings (id, investor_id, asset_id, units, acquired_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, now(), now())`,
        [h.inv, h.asset, h.units]
      );
      console.log(`  ✓ ${h.invName} → ${h.assetName}: ${h.units.toLocaleString()} units`);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n========================================');
  console.log('  Demo seed complete!');
  console.log('========================================');
  console.log('  2 fund structures (SIF + RAIF)');
  console.log('  6 eligibility criteria');
  console.log('  3 assets (2 SIF classes, 1 RAIF class)');
  console.log('  3 rules (permissive)');
  console.log('  6 investors (professional, semi_professional, institutional)');
  console.log('  7 holdings');
  console.log('========================================');
  console.log('\nRisk flags for demo:');
  console.log('  - Klaus Schmidt: KYC expires 2026-05-15 (within 90 days)');
  console.log('  - Acme Capital: 40% concentration in SIF Class A');
  console.log('========================================');
}

seed()
  .then(() => {
    closeDb();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nSeed failed:', err);
    closeDb();
    process.exit(1);
  });
