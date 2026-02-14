/**
 * Seed Demo Data — Luxembourg SIF/RAIF + German Spezial-AIF workflows
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING or check-before-insert
 * patterns throughout. Safe to run multiple times.
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query, execute, closeDb, DEFAULT_TENANT_ID } from '../src/backend/db.js';
import { sealAllUnsealed } from '../src/backend/services/integrity-service.js';

// ---------------------------------------------------------------------------
// Fixed UUIDs for predictable references
// ---------------------------------------------------------------------------

// Fund Structures
const SIF_ID   = '00000000-0000-0000-0000-000000000001';
const RAIF_ID  = '00000000-0000-0000-0000-000000000002';
const GAMMA_ID = '10000000-0000-0000-0000-000000000003';

// Assets (fixed UUIDs for new assets; existing assets use name-based lookup)
const GAMMA_A_ID = '20000000-0000-0000-0000-000000000004';
const GAMMA_B_ID = '20000000-0000-0000-0000-000000000005';

// Investors (fixed UUIDs for all 15 investors)
const INV1_ID  = '30000000-0000-0000-0000-000000000001';
const INV2_ID  = '30000000-0000-0000-0000-000000000002';
const INV3_ID  = '30000000-0000-0000-0000-000000000003';
const INV4_ID  = '30000000-0000-0000-0000-000000000004';
const INV5_ID  = '30000000-0000-0000-0000-000000000005';
const INV6_ID  = '30000000-0000-0000-0000-000000000006';
const INV7_ID  = '30000000-0000-0000-0000-000000000007';
const INV8_ID  = '30000000-0000-0000-0000-000000000008';
const INV9_ID  = '30000000-0000-0000-0000-000000000009';
const INV10_ID = '30000000-0000-0000-0000-000000000010';
const INV11_ID = '30000000-0000-0000-0000-000000000011';
const INV12_ID = '30000000-0000-0000-0000-000000000012';
const INV13_ID = '30000000-0000-0000-0000-000000000013';
const INV14_ID = '30000000-0000-0000-0000-000000000014';
const INV15_ID = '30000000-0000-0000-0000-000000000015';

// Assets (fixed UUIDs for existing assets too, for reliable cross-references)
const SIF_A_ID  = '20000000-0000-0000-0000-000000000001';
const SIF_B_ID  = '20000000-0000-0000-0000-000000000002';
const RAIF_A_ID = '20000000-0000-0000-0000-000000000003';

// Onboarding Records
const OB1_ID = '40000000-0000-0000-0000-000000000001';
const OB2_ID = '40000000-0000-0000-0000-000000000002';
const OB3_ID = '40000000-0000-0000-0000-000000000003';
const OB4_ID = '40000000-0000-0000-0000-000000000004';
const OB5_ID = '40000000-0000-0000-0000-000000000005';
const OB6_ID = '40000000-0000-0000-0000-000000000006';

// Decision Records
const DR1_ID  = '50000000-0000-0000-0000-000000000001';
const DR2_ID  = '50000000-0000-0000-0000-000000000002';
const DR3_ID  = '50000000-0000-0000-0000-000000000003';
const DR4_ID  = '50000000-0000-0000-0000-000000000004';
const DR5_ID  = '50000000-0000-0000-0000-000000000005';
const DR6_ID  = '50000000-0000-0000-0000-000000000006';
const DR7_ID  = '50000000-0000-0000-0000-000000000007';
const DR8_ID  = '50000000-0000-0000-0000-000000000008';
const DR9_ID  = '50000000-0000-0000-0000-000000000009';
const DR10_ID = '50000000-0000-0000-0000-000000000010';

// Transfers
const TR1_ID = '60000000-0000-0000-0000-000000000001';
const TR2_ID = '60000000-0000-0000-0000-000000000002';
const TR3_ID = '60000000-0000-0000-0000-000000000003';
const TR4_ID = '60000000-0000-0000-0000-000000000004';
const TR5_ID = '60000000-0000-0000-0000-000000000005';
const TR6_ID = '60000000-0000-0000-0000-000000000006';
const TR7_ID = '60000000-0000-0000-0000-000000000007';
const TR8_ID = '60000000-0000-0000-0000-000000000008';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function exists(table: string, id: string): Promise<boolean> {
  const rows = await query('SELECT 1 FROM ' + table + ' WHERE id = $1', [id]);
  return rows.length > 0;
}

async function ensureUser(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'compliance_officer' | 'viewer'
): Promise<void> {
  const existing = await query<{ id: string; password_hash: string; role: string; active: boolean }>(
    'SELECT id, password_hash, role, active FROM users WHERE email = $1',
    [email]
  );

  if (existing.length > 0) {
    const user = existing[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    const roleChanged = user.role !== role;
    const wasInactive = !user.active;

    if (!passwordMatches || roleChanged || wasInactive) {
      const nextHash = passwordMatches ? user.password_hash : await bcrypt.hash(password, 10);
      await execute(
        `UPDATE users
           SET password_hash = $2,
               role = $3,
               name = $4,
               active = true,
               updated_at = now()
         WHERE id = $1`,
        [user.id, nextHash, role, name]
      );
      console.log(
        `  ↺ Refreshed ${email} (role=${role}${passwordMatches ? '' : ', password reset'})`
      );
    } else {
      console.log(`  → ${email} already up to date`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await execute(
    `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now())`,
    [email, passwordHash, name, role]
  );
  console.log(`  ✓ Created ${email} (password: ${password})`);
}

async function seed() {
  console.log('Seeding demo data for Luxembourg SIF/RAIF + German Spezial-AIF workflows...\n');

  await execute(
    `INSERT INTO tenants (id, name, slug, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_TENANT_ID, 'Caelith Demo', 'demo', 'active']
  );

  // =========================================================================
  // 0. Users
  // =========================================================================
  console.log('[Users]');

  const retiredDemoUsers = ['compliance@caelith.com', 'ops@caelith.com', 'viewer@caelith.com'];
  for (const email of retiredDemoUsers) {
    const deactivated = await query<{ email: string }>(
      `UPDATE users
         SET active = false, updated_at = now()
       WHERE email = $1 AND active = true
       RETURNING email`,
      [email]
    );
    if (deactivated.length > 0) {
      console.log(`  ↺ Deactivated legacy demo account ${email}`);
    }
  }

  const demoUsers: Array<{
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'compliance_officer' | 'viewer';
  }> = [
    { email: 'admin@caelith.com', password: 'admin1234', name: 'System Admin', role: 'admin' },
    { email: 'test1@caelith.com', password: 'test1pass!', name: 'Compliance Test User', role: 'compliance_officer' },
    { email: 'test2@caelith.com', password: 'test2pass!', name: 'Operations Test User', role: 'admin' },
    { email: 'demo1@caelith.com', password: 'demo1pass!', name: 'Demo Portfolio Viewer 1', role: 'viewer' },
    { email: 'demo2@caelith.com', password: 'demo2pass!', name: 'Demo Portfolio Viewer 2', role: 'viewer' },
  ];

  for (const user of demoUsers) {
    await ensureUser(user.email, user.password, user.name, user.role);
  }

  // =========================================================================
  // 1. Fund Structures (fixed UUIDs — direct SQL)
  // =========================================================================
  console.log('\n[Fund Structures]');

  const funds = [
    { id: SIF_ID,   name: 'Luxembourg SIF Alpha',      legal_form: 'SIF',         domicile: 'LU', framework: 'AIFMD', aifm_name: null },
    { id: RAIF_ID,  name: 'Luxembourg RAIF Beta',       legal_form: 'RAIF',        domicile: 'LU', framework: 'AIFMD', aifm_name: null },
    { id: GAMMA_ID, name: 'German Spezial-AIF Gamma',   legal_form: 'Spezial_AIF', domicile: 'DE', framework: 'AIFMD', aifm_name: 'Caelith Asset Management GmbH' },
  ];

  for (const f of funds) {
    if (await exists('fund_structures', f.id)) {
      console.log(`  → ${f.name} already exists`);
    } else {
      await execute(
        `INSERT INTO fund_structures
           (id, name, legal_form, domicile, regulatory_framework, aifm_name, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'EUR', 'active', now(), now())`,
        [f.id, f.name, f.legal_form, f.domicile, f.framework, f.aifm_name]
      );
      console.log(`  ✓ Created ${f.name}`);
    }
  }

  // =========================================================================
  // 2. Eligibility Criteria (amounts in cents)
  // =========================================================================
  console.log('\n[Eligibility Criteria]');

  const criteria = [
    // SIF criteria
    { fs: SIF_ID,   type: 'professional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,   type: 'semi_professional',  min: 12500000, suit: true,  src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,   type: 'institutional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    // RAIF criteria
    { fs: RAIF_ID,  type: 'professional',       min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID,  type: 'semi_professional',  min: 12500000, suit: true,  src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID,  type: 'institutional',      min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    // Gamma (German Spezial-AIF) criteria
    { fs: GAMMA_ID, type: 'professional',       min: 0,        suit: false, src: 'KAGB §1(6)' },
    { fs: GAMMA_ID, type: 'semi_professional',  min: 20000000, suit: true,  src: 'KAGB §1(19) Nr. 33 — €200,000 minimum' },
    { fs: GAMMA_ID, type: 'institutional',      min: 0,        suit: false, src: 'KAGB §1(6)' },
  ];

  for (const c of criteria) {
    const fundLabel = c.fs === SIF_ID ? 'SIF' : c.fs === RAIF_ID ? 'RAIF' : 'Gamma';
    const existing = await query(
      `SELECT 1 FROM eligibility_criteria
       WHERE fund_structure_id = $1 AND investor_type = $2 AND jurisdiction = '*' AND superseded_at IS NULL`,
      [c.fs, c.type]
    );
    if (existing.length > 0) {
      console.log(`  → ${c.type} for ${fundLabel} already exists`);
    } else {
      await execute(
        `INSERT INTO eligibility_criteria
           (id, fund_structure_id, jurisdiction, investor_type, minimum_investment,
            suitability_required, documentation_required, source_reference, effective_date, created_at)
         VALUES (gen_random_uuid(), $1, '*', $2, $3, $4, '[]', $5, CURRENT_DATE, now())`,
        [c.fs, c.type, c.min, c.suit, c.src]
      );
      console.log(`  ✓ Created ${c.type} criteria for ${fundLabel} (min: €${(c.min / 100).toLocaleString()})`);
    }
  }

  // =========================================================================
  // 3. Assets (linked to fund structures — fixed UUIDs)
  // =========================================================================
  console.log('\n[Assets]');

  const assets = [
    { id: SIF_A_ID,   name: 'LU SIF Alpha - Class A',         fs: SIF_ID,   type: 'Fund', units: 1000000, price: 1.0 },
    { id: SIF_B_ID,   name: 'LU SIF Alpha - Class B',         fs: SIF_ID,   type: 'Fund', units: 500000,  price: 10.0 },
    { id: RAIF_A_ID,  name: 'LU RAIF Beta - Class A',         fs: RAIF_ID,  type: 'Fund', units: 2000000, price: 1.0 },
    { id: GAMMA_A_ID, name: 'Spezial-AIF Gamma Class A',      fs: GAMMA_ID, type: 'fund_unit', units: 1500000, price: 100.0 },
    { id: GAMMA_B_ID, name: 'Spezial-AIF Gamma Class B',      fs: GAMMA_ID, type: 'fund_unit', units: 5000000, price: 1000.0 },
  ];

  for (const a of assets) {
    // Check if asset exists by id (fixed UUID) or by name (legacy)
    const existingById = await query('SELECT id FROM assets WHERE id = $1', [a.id]);
    const existingByName = await query<{ id: string }>('SELECT id FROM assets WHERE name = $1', [a.name]);

    if (existingById.length > 0) {
      console.log(`  → ${a.name} already exists (by id)`);
    } else if (existingByName.length > 0) {
      console.log(`  → ${a.name} already exists (by name, id=${existingByName[0].id})`);
    } else {
      await execute(
        `INSERT INTO assets (id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [a.id, a.name, a.type, a.units, a.fs, a.price]
      );
      console.log(`  ✓ Created ${a.name} (${a.units.toLocaleString()} units @ €${a.price})`);
    }
  }

  // Resolve asset IDs: use fixed UUIDs when possible, fall back to name lookup
  async function resolveAssetId(fixedId: string, name: string): Promise<string> {
    const byId = await query<{ id: string }>('SELECT id FROM assets WHERE id = $1', [fixedId]);
    if (byId.length > 0) return fixedId;
    const byName = await query<{ id: string }>('SELECT id FROM assets WHERE name = $1', [name]);
    if (byName.length > 0) return byName[0].id;
    throw new Error(`Asset not found: ${name} (${fixedId})`);
  }

  const sifClassA  = await resolveAssetId(SIF_A_ID,   'LU SIF Alpha - Class A');
  const sifClassB  = await resolveAssetId(SIF_B_ID,   'LU SIF Alpha - Class B');
  const raifClassA = await resolveAssetId(RAIF_A_ID,  'LU RAIF Beta - Class A');
  const gammaClassA = await resolveAssetId(GAMMA_A_ID, 'Spezial-AIF Gamma Class A');
  const gammaClassB = await resolveAssetId(GAMMA_B_ID, 'Spezial-AIF Gamma Class B');

  // =========================================================================
  // 4. Rules (permissive defaults, one per asset)
  // =========================================================================
  console.log('\n[Rules]');

  const allAssets = [
    { id: sifClassA,   name: 'SIF Class A' },
    { id: sifClassB,   name: 'SIF Class B' },
    { id: raifClassA,  name: 'RAIF Class A' },
    { id: gammaClassA, name: 'Gamma Class A' },
    { id: gammaClassB, name: 'Gamma Class B' },
  ];

  for (const asset of allAssets) {
    const existing = await query('SELECT 1 FROM rules WHERE asset_id = $1', [asset.id]);
    if (existing.length > 0) {
      console.log(`  → Rules for ${asset.name} already exist`);
    } else {
      await execute(
        `INSERT INTO rules
           (id, asset_id, version, qualification_required, lockup_days, jurisdiction_whitelist, transfer_whitelist, created_at)
         VALUES (gen_random_uuid(), $1, 1, false, 0, '[]', NULL, now())`,
        [asset.id]
      );
      console.log(`  ✓ Created permissive rules for ${asset.name}`);
    }
  }

  // =========================================================================
  // 5. Investors (15 total — 6 existing + 9 new, all with fixed UUIDs)
  // =========================================================================
  console.log('\n[Investors]');

  const investors = [
    // Original 6 investors
    { id: INV1_ID,  name: 'Marie Laurent',          jur: 'FR', type: 'professional',      kyc: 'verified', expiry: '2027-12-31', accredited: true },
    { id: INV2_ID,  name: 'Klaus Schmidt',          jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2026-05-15', accredited: true },
    { id: INV3_ID,  name: 'Acme Capital Partners',  jur: 'LU', type: 'institutional',     kyc: 'verified', expiry: '2028-06-30', accredited: true },
    { id: INV4_ID,  name: 'Sophie Dubois',          jur: 'FR', type: 'professional',      kyc: 'verified', expiry: '2027-03-15', accredited: true },
    { id: INV5_ID,  name: 'Erik Nordström',         jur: 'NO', type: 'semi_professional', kyc: 'verified', expiry: '2026-11-20', accredited: true },
    { id: INV6_ID,  name: 'Pieter van Dijk',        jur: 'NL', type: 'institutional',     kyc: 'verified', expiry: '2027-06-01', accredited: true },
    // New 9 investors
    { id: INV7_ID,  name: 'Hans Weber',             jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2026-08-15', accredited: true },
    { id: INV8_ID,  name: 'Isabella Rossi',         jur: 'IT', type: 'professional',      kyc: 'verified', expiry: '2027-01-20', accredited: true },
    { id: INV9_ID,  name: 'Dublin Capital Partners', jur: 'IE', type: 'institutional',    kyc: 'verified', expiry: '2027-09-01', accredited: true },
    { id: INV10_ID, name: 'Zürich Wealth AG',       jur: 'CH', type: 'institutional',     kyc: 'verified', expiry: '2027-04-30', accredited: true },
    { id: INV11_ID, name: 'Chen Wei Investment Ltd', jur: 'SG', type: 'professional',     kyc: 'verified', expiry: '2026-12-10', accredited: true },
    { id: INV12_ID, name: 'Anna Kowalski',          jur: 'PL', type: 'retail',            kyc: 'pending',  expiry: null,         accredited: false },
    { id: INV13_ID, name: 'Nordic Fund Solutions',   jur: 'NO', type: 'institutional',    kyc: 'verified', expiry: '2027-06-15', accredited: true },
    { id: INV14_ID, name: 'Miguel Santos',          jur: 'PT', type: 'semi_professional', kyc: 'expired',  expiry: '2025-11-30', accredited: true },
    { id: INV15_ID, name: 'Dr. Sarah Bennett',      jur: 'GB', type: 'professional',      kyc: 'verified', expiry: '2026-09-22', accredited: true },
  ];

  for (const inv of investors) {
    // Check by fixed UUID first, then by name (for legacy data)
    const existingById = await query('SELECT 1 FROM investors WHERE id = $1', [inv.id]);
    const existingByName = await query<{ id: string }>('SELECT id FROM investors WHERE name = $1', [inv.name]);

    if (existingById.length > 0) {
      console.log(`  → ${inv.name} already exists (by id)`);
    } else if (existingByName.length > 0) {
      console.log(`  → ${inv.name} already exists (by name, id=${existingByName[0].id})`);
    } else {
      await execute(
        `INSERT INTO investors
           (id, name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [inv.id, inv.name, inv.jur, inv.accredited, inv.type, inv.kyc, inv.expiry]
      );
      console.log(`  ✓ Created ${inv.name} (${inv.jur}, ${inv.type}, KYC ${inv.kyc}${inv.expiry ? `, expires ${inv.expiry}` : ''})`);
    }
  }

  // Resolve investor IDs: use fixed UUIDs when possible, fall back to name lookup
  async function resolveInvestorId(fixedId: string, name: string): Promise<string> {
    const byId = await query<{ id: string }>('SELECT id FROM investors WHERE id = $1', [fixedId]);
    if (byId.length > 0) return fixedId;
    const byName = await query<{ id: string }>('SELECT id FROM investors WHERE name = $1', [name]);
    if (byName.length > 0) return byName[0].id;
    throw new Error(`Investor not found: ${name} (${fixedId})`);
  }

  const marieId   = await resolveInvestorId(INV1_ID,  'Marie Laurent');
  const klausId   = await resolveInvestorId(INV2_ID,  'Klaus Schmidt');
  const acmeId    = await resolveInvestorId(INV3_ID,  'Acme Capital Partners');
  const sophieId  = await resolveInvestorId(INV4_ID,  'Sophie Dubois');
  const erikId    = await resolveInvestorId(INV5_ID,  'Erik Nordström');
  const pieterId  = await resolveInvestorId(INV6_ID,  'Pieter van Dijk');
  const hansId    = await resolveInvestorId(INV7_ID,  'Hans Weber');
  const isabellaId = await resolveInvestorId(INV8_ID, 'Isabella Rossi');
  const dublinId  = await resolveInvestorId(INV9_ID,  'Dublin Capital Partners');
  const zurichId  = await resolveInvestorId(INV10_ID, 'Zürich Wealth AG');
  const chenId    = await resolveInvestorId(INV11_ID, 'Chen Wei Investment Ltd');
  const annaId    = await resolveInvestorId(INV12_ID, 'Anna Kowalski');
  const nordicId  = await resolveInvestorId(INV13_ID, 'Nordic Fund Solutions');
  const miguelId  = await resolveInvestorId(INV14_ID, 'Miguel Santos');
  const sarahId   = await resolveInvestorId(INV15_ID, 'Dr. Sarah Bennett');

  // =========================================================================
  // 6. Holdings (distributed across 3 funds / 5 assets)
  // =========================================================================
  console.log('\n[Holdings]');

  const holdings = [
    // --- SIF Alpha Class A (1,000,000 total units) ---
    { inv: marieId,   invName: 'Marie Laurent',         asset: sifClassA,   assetName: 'SIF Class A',    units: 200000 },
    { inv: klausId,   invName: 'Klaus Schmidt',         asset: sifClassA,   assetName: 'SIF Class A',    units: 150000 },
    { inv: acmeId,    invName: 'Acme Capital Partners',  asset: sifClassA,   assetName: 'SIF Class A',    units: 400000 }, // 40% concentration
    { inv: erikId,    invName: 'Erik Nordström',         asset: sifClassA,   assetName: 'SIF Class A',    units: 100000 },
    { inv: dublinId,  invName: 'Dublin Capital Partners', asset: sifClassA,  assetName: 'SIF Class A',    units: 200000 },

    // --- SIF Alpha Class B (500,000 total units) ---
    { inv: isabellaId, invName: 'Isabella Rossi',       asset: sifClassB,   assetName: 'SIF Class B',    units: 150000 }, // 30% concentration
    { inv: sophieId,   invName: 'Sophie Dubois',        asset: sifClassB,   assetName: 'SIF Class B',    units: 80000 },

    // --- RAIF Beta Class A (2,000,000 total units) ---
    { inv: acmeId,    invName: 'Acme Capital Partners',  asset: raifClassA,  assetName: 'RAIF Class A',   units: 500000 },
    { inv: sophieId,  invName: 'Sophie Dubois',          asset: raifClassA,  assetName: 'RAIF Class A',   units: 300000 },
    { inv: pieterId,  invName: 'Pieter van Dijk',        asset: raifClassA,  assetName: 'RAIF Class A',   units: 600000 }, // 30% concentration
    { inv: chenId,    invName: 'Chen Wei Investment Ltd', asset: raifClassA,  assetName: 'RAIF Class A',   units: 50000 },
    { inv: sarahId,   invName: 'Dr. Sarah Bennett',      asset: raifClassA,  assetName: 'RAIF Class A',   units: 100000 },

    // --- Gamma Class A (1,500,000 total units) ---
    { inv: hansId,    invName: 'Hans Weber',             asset: gammaClassA, assetName: 'Gamma Class A',  units: 400000 }, // 26.7% concentration
    { inv: dublinId,  invName: 'Dublin Capital Partners', asset: gammaClassA, assetName: 'Gamma Class A',  units: 100000 },
    { inv: nordicId,  invName: 'Nordic Fund Solutions',   asset: gammaClassA, assetName: 'Gamma Class A',  units: 300000 },

    // --- Gamma Class B (5,000,000 total units) ---
    { inv: zurichId,  invName: 'Zürich Wealth AG',       asset: gammaClassB, assetName: 'Gamma Class B',  units: 2000000 }, // 40% concentration
    { inv: sarahId,   invName: 'Dr. Sarah Bennett',      asset: gammaClassB, assetName: 'Gamma Class B',  units: 500000 },
    { inv: nordicId,  invName: 'Nordic Fund Solutions',   asset: gammaClassB, assetName: 'Gamma Class B',  units: 350000 },
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
  // 7. Decision Records (10 total)
  // =========================================================================
  console.log('\n[Decision Records]');

  const decisionRecords = [
    // DR1: Eligibility check — Isabella Rossi approved for SIF Class B
    {
      id: DR1_ID,
      decision_type: 'eligibility_check',
      asset_id: sifClassB,
      subject_id: isabellaId,
      input_snapshot: {
        investor_name: 'Isabella Rossi',
        investor_type: 'professional',
        jurisdiction: 'IT',
        kyc_status: 'verified',
        kyc_expiry: '2027-01-20',
        requested_units: 150000,
      },
      rule_version_snapshot: {
        fund: 'Luxembourg SIF Alpha',
        legal_form: 'SIF',
        criteria_source: 'SIF Law 13 Feb 2007, Art. 2',
        minimum_investment: 0,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: true, message: 'Professional investor eligible for SIF' },
          { rule: 'minimum_investment', passed: true, message: 'Investment meets €0 minimum for professional' },
          { rule: 'kyc_verified', passed: true, message: 'KYC status verified, expires 2027-01-20' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
    // DR2: Transfer validation — Marie → Klaus in SIF Class A (approved)
    {
      id: DR2_ID,
      decision_type: 'transfer_validation',
      asset_id: sifClassA,
      subject_id: klausId,
      input_snapshot: {
        from_investor: 'Marie Laurent',
        to_investor: 'Klaus Schmidt',
        units: 20000,
        asset: 'LU SIF Alpha - Class A',
      },
      rule_version_snapshot: {
        fund: 'Luxembourg SIF Alpha',
        lockup_days: 0,
        qualification_required: false,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
          { rule: 'recipient_eligible', passed: true, message: 'Klaus Schmidt is semi_professional, eligible for SIF' },
          { rule: 'concentration_limit', passed: true, message: 'Post-transfer concentration 17% within limits' },
          { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
    // DR3: Onboarding approval — Hans Weber for SIF Class A (eligible)
    {
      id: DR3_ID,
      decision_type: 'onboarding_approval',
      asset_id: sifClassA,
      subject_id: hansId,
      input_snapshot: {
        investor_name: 'Hans Weber',
        investor_type: 'semi_professional',
        jurisdiction: 'DE',
        kyc_status: 'verified',
        requested_units: 100000,
      },
      rule_version_snapshot: {
        fund: 'Luxembourg SIF Alpha',
        legal_form: 'SIF',
        criteria_source: 'SIF Law 13 Feb 2007, Art. 2',
        minimum_investment: 12500000,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: true, message: 'Semi-professional investor eligible for SIF with minimum investment' },
          { rule: 'minimum_investment', passed: true, message: 'Investment meets €125,000 minimum for semi_professional' },
          { rule: 'kyc_verified', passed: true, message: 'KYC status verified, expires 2026-08-15' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
    // DR4: Eligibility check — Anna Kowalski REJECTED for Gamma Class A (retail not allowed)
    {
      id: DR4_ID,
      decision_type: 'eligibility_check',
      asset_id: gammaClassA,
      subject_id: annaId,
      input_snapshot: {
        investor_name: 'Anna Kowalski',
        investor_type: 'retail',
        jurisdiction: 'PL',
        kyc_status: 'pending',
        requested_units: 50000,
      },
      rule_version_snapshot: {
        fund: 'German Spezial-AIF Gamma',
        legal_form: 'Spezial_AIF',
        criteria_source: 'KAGB §1(6)',
        minimum_investment: 0,
      },
      result: 'rejected',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: false, message: 'Retail investors not eligible for Spezial-AIF' },
          { rule: 'kyc_verified', passed: false, message: 'KYC status is pending, must be verified' },
        ],
        overall: 'rejected',
        violation_count: 2,
      },
    },
    // DR5: Eligibility check — Miguel Santos REJECTED for Gamma Class B (expired KYC + below minimum)
    {
      id: DR5_ID,
      decision_type: 'eligibility_check',
      asset_id: gammaClassB,
      subject_id: miguelId,
      input_snapshot: {
        investor_name: 'Miguel Santos',
        investor_type: 'semi_professional',
        jurisdiction: 'PT',
        kyc_status: 'expired',
        kyc_expiry: '2025-11-30',
        requested_units: 200000,
      },
      rule_version_snapshot: {
        fund: 'German Spezial-AIF Gamma',
        legal_form: 'Spezial_AIF',
        criteria_source: 'KAGB §1(19) Nr. 33',
        minimum_investment: 20000000,
      },
      result: 'rejected',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: true, message: 'Semi-professional investor eligible for Spezial-AIF with minimum investment' },
          { rule: 'minimum_investment', passed: false, message: 'Investment below KAGB §1(19) Nr. 33 minimum of €200,000' },
          { rule: 'kyc_verified', passed: false, message: 'KYC status expired since 2025-11-30, renewal required' },
        ],
        overall: 'rejected',
        violation_count: 2,
      },
    },
    // DR6: Onboarding approval — Isabella Rossi for Gamma Class A (approved)
    {
      id: DR6_ID,
      decision_type: 'onboarding_approval',
      asset_id: gammaClassA,
      subject_id: isabellaId,
      input_snapshot: {
        investor_name: 'Isabella Rossi',
        investor_type: 'professional',
        jurisdiction: 'IT',
        kyc_status: 'verified',
        requested_units: 200000,
      },
      rule_version_snapshot: {
        fund: 'German Spezial-AIF Gamma',
        legal_form: 'Spezial_AIF',
        criteria_source: 'KAGB §1(6)',
        minimum_investment: 0,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: true, message: 'Professional investor eligible for Spezial-AIF' },
          { rule: 'minimum_investment', passed: true, message: 'No minimum for professional investors' },
          { rule: 'kyc_verified', passed: true, message: 'KYC status verified, expires 2027-01-20' },
          { rule: 'aifmd_passport', passed: true, message: 'Italian investor eligible via AIFMD marketing passport' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
    // DR7: Transfer validation — Zürich Wealth → Nordic Fund in Gamma Class B (approved)
    {
      id: DR7_ID,
      decision_type: 'transfer_validation',
      asset_id: gammaClassB,
      subject_id: nordicId,
      input_snapshot: {
        from_investor: 'Zürich Wealth AG',
        to_investor: 'Nordic Fund Solutions',
        units: 150000,
        asset: 'Spezial-AIF Gamma Class B',
      },
      rule_version_snapshot: {
        fund: 'German Spezial-AIF Gamma',
        lockup_days: 0,
        qualification_required: false,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
          { rule: 'recipient_eligible', passed: true, message: 'Nordic Fund Solutions is institutional, eligible for Spezial-AIF' },
          { rule: 'concentration_limit', passed: true, message: 'Post-transfer concentration 10% within limits' },
          { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
    // DR8: Scenario analysis — What-if: Acme Capital concentration in SIF
    {
      id: DR8_ID,
      decision_type: 'scenario_analysis',
      asset_id: sifClassA,
      subject_id: acmeId,
      input_snapshot: {
        scenario: 'Acme Capital acquires additional 200,000 units in SIF Class A',
        current_holding: 400000,
        proposed_additional: 200000,
        total_after: 600000,
        total_units: 1000000,
        concentration_after: '60%',
      },
      rule_version_snapshot: {
        fund: 'Luxembourg SIF Alpha',
        concentration_limit_pct: null,
        max_investors: null,
      },
      result: 'simulated',
      result_details: {
        checks: [
          { rule: 'concentration_limit', passed: false, message: 'Post-acquisition concentration would be 60%, exceeding recommended 25% threshold' },
          { rule: 'diversification_risk', passed: false, message: 'Single investor would hold majority of share class' },
          { rule: 'investor_eligible', passed: true, message: 'Acme Capital Partners is institutional, eligible for SIF' },
        ],
        overall: 'rejected',
        violation_count: 2,
        recommendation: 'Consider capping additional subscription at 100,000 units to maintain concentration below 50%',
      },
    },
    // DR9: Eligibility check — Dr. Sarah Bennett REJECTED for SIF Class B (below minimum for semi_professional)
    {
      id: DR9_ID,
      decision_type: 'eligibility_check',
      asset_id: sifClassB,
      subject_id: sarahId,
      input_snapshot: {
        investor_name: 'Dr. Sarah Bennett',
        investor_type: 'professional',
        jurisdiction: 'GB',
        kyc_status: 'verified',
        requested_units: 50000,
        investment_value: 500000,
      },
      rule_version_snapshot: {
        fund: 'Luxembourg SIF Alpha',
        legal_form: 'SIF',
        criteria_source: 'SIF Law 13 Feb 2007, Art. 2',
        minimum_investment: 0,
      },
      result: 'rejected',
      result_details: {
        checks: [
          { rule: 'investor_type_eligible', passed: true, message: 'Professional investor eligible for SIF' },
          { rule: 'kyc_verified', passed: true, message: 'KYC status verified, expires 2026-09-22' },
          { rule: 'kagb_minimum', passed: false, message: 'KAGB §1(19) Nr. 33 minimum not met' },
        ],
        overall: 'rejected',
        violation_count: 1,
      },
    },
    // DR10: Transfer validation — Chen Wei → Hans Weber in RAIF Class A (approved)
    {
      id: DR10_ID,
      decision_type: 'transfer_validation',
      asset_id: raifClassA,
      subject_id: hansId,
      input_snapshot: {
        from_investor: 'Chen Wei Investment Ltd',
        to_investor: 'Hans Weber',
        units: 10000,
        asset: 'LU RAIF Beta - Class A',
      },
      rule_version_snapshot: {
        fund: 'Luxembourg RAIF Beta',
        lockup_days: 0,
        qualification_required: false,
      },
      result: 'approved',
      result_details: {
        checks: [
          { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
          { rule: 'recipient_eligible', passed: true, message: 'Hans Weber is semi_professional, eligible for RAIF with minimum investment' },
          { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
        ],
        overall: 'approved',
        violation_count: 0,
      },
    },
  ];

  for (const dr of decisionRecords) {
    if (await exists('decision_records', dr.id)) {
      console.log(`  → Decision ${dr.id.slice(-2)} (${dr.decision_type}) already exists`);
    } else {
      await execute(
        `INSERT INTO decision_records
           (id, decision_type, asset_id, subject_id, input_snapshot, rule_version_snapshot, result, result_details, decided_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
        [
          dr.id,
          dr.decision_type,
          dr.asset_id,
          dr.subject_id,
          JSON.stringify(dr.input_snapshot),
          JSON.stringify(dr.rule_version_snapshot),
          dr.result,
          JSON.stringify(dr.result_details),
        ]
      );
      console.log(`  ✓ Decision ${dr.id.slice(-2)}: ${dr.decision_type} → ${dr.result}`);
    }
  }

  // =========================================================================
  // 8. Onboarding Records (6 total)
  // =========================================================================
  console.log('\n[Onboarding Records]');

  const onboardingRecords = [
    // OB1: Anna Kowalski → Gamma Class A, 50000 units, status: 'applied'
    {
      id: OB1_ID,
      investor_id: annaId,
      asset_id: gammaClassA,
      status: 'applied',
      requested_units: 50000,
      eligibility_decision_id: DR4_ID,
      approval_decision_id: null,
      rejection_reasons: null,
      invName: 'Anna Kowalski',
      assetName: 'Gamma Class A',
    },
    // OB2: Miguel Santos → Gamma Class B, 200000 units, status: 'applied'
    {
      id: OB2_ID,
      investor_id: miguelId,
      asset_id: gammaClassB,
      status: 'applied',
      requested_units: 200000,
      eligibility_decision_id: DR5_ID,
      approval_decision_id: null,
      rejection_reasons: null,
      invName: 'Miguel Santos',
      assetName: 'Gamma Class B',
    },
    // OB3: Hans Weber → SIF Class A, 100000 units, status: 'eligible'
    {
      id: OB3_ID,
      investor_id: hansId,
      asset_id: sifClassA,
      status: 'eligible',
      requested_units: 100000,
      eligibility_decision_id: DR3_ID,
      approval_decision_id: null,
      rejection_reasons: null,
      invName: 'Hans Weber',
      assetName: 'SIF Class A',
    },
    // OB4: Isabella Rossi → Gamma Class A, 200000 units, status: 'approved'
    {
      id: OB4_ID,
      investor_id: isabellaId,
      asset_id: gammaClassA,
      status: 'approved',
      requested_units: 200000,
      eligibility_decision_id: null,
      approval_decision_id: DR6_ID,
      rejection_reasons: null,
      invName: 'Isabella Rossi',
      assetName: 'Gamma Class A',
    },
    // OB5: Chen Wei → Gamma Class B, 500000 units, status: 'allocated'
    {
      id: OB5_ID,
      investor_id: chenId,
      asset_id: gammaClassB,
      status: 'allocated',
      requested_units: 500000,
      eligibility_decision_id: null,
      approval_decision_id: null,
      rejection_reasons: null,
      invName: 'Chen Wei Investment Ltd',
      assetName: 'Gamma Class B',
    },
    // OB6: Dr. Sarah Bennett → SIF Class B, 50000 units, status: 'rejected'
    {
      id: OB6_ID,
      investor_id: sarahId,
      asset_id: sifClassB,
      status: 'rejected',
      requested_units: 50000,
      eligibility_decision_id: DR9_ID,
      approval_decision_id: null,
      rejection_reasons: JSON.stringify(['KAGB §1(19) Nr. 33 minimum not met']),
      invName: 'Dr. Sarah Bennett',
      assetName: 'SIF Class B',
    },
  ];

  for (const ob of onboardingRecords) {
    if (await exists('onboarding_records', ob.id)) {
      console.log(`  → Onboarding ${ob.invName} → ${ob.assetName} already exists`);
    } else {
      await execute(
        `INSERT INTO onboarding_records
           (id, investor_id, asset_id, status, requested_units,
            eligibility_decision_id, approval_decision_id, rejection_reasons,
            applied_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), now())`,
        [
          ob.id,
          ob.investor_id,
          ob.asset_id,
          ob.status,
          ob.requested_units,
          ob.eligibility_decision_id,
          ob.approval_decision_id,
          ob.rejection_reasons,
        ]
      );
      console.log(`  ✓ Onboarding: ${ob.invName} → ${ob.assetName} (${ob.status}, ${ob.requested_units.toLocaleString()} units)`);
    }
  }

  // =========================================================================
  // 9. Transfers (8 total)
  // =========================================================================
  console.log('\n[Transfers]');

  const transfers = [
    // TR1: Marie → Klaus, SIF Class A, 20000 units (executed, linked to DR2)
    {
      id: TR1_ID,
      asset_id: sifClassA,
      from_id: marieId,
      to_id: klausId,
      units: 20000,
      decision_record_id: DR2_ID,
      fromName: 'Marie Laurent',
      toName: 'Klaus Schmidt',
      assetName: 'SIF Class A',
    },
    // TR2: Acme → Sophie, RAIF Class A, 50000 units (executed)
    {
      id: TR2_ID,
      asset_id: raifClassA,
      from_id: acmeId,
      to_id: sophieId,
      units: 50000,
      decision_record_id: null,
      fromName: 'Acme Capital Partners',
      toName: 'Sophie Dubois',
      assetName: 'RAIF Class A',
    },
    // TR3: Zürich Wealth → Nordic Fund, Gamma Class B, 150000 units (executed, linked to DR7)
    {
      id: TR3_ID,
      asset_id: gammaClassB,
      from_id: zurichId,
      to_id: nordicId,
      units: 150000,
      decision_record_id: DR7_ID,
      fromName: 'Zürich Wealth AG',
      toName: 'Nordic Fund Solutions',
      assetName: 'Gamma Class B',
    },
    // TR4: Erik → Dublin Capital, SIF Class A, 30000 units (executed)
    {
      id: TR4_ID,
      asset_id: sifClassA,
      from_id: erikId,
      to_id: dublinId,
      units: 30000,
      decision_record_id: null,
      fromName: 'Erik Nordström',
      toName: 'Dublin Capital Partners',
      assetName: 'SIF Class A',
    },
    // TR5: Pieter → Chen Wei, RAIF Class A, 25000 units (executed, linked to DR10 indirectly)
    {
      id: TR5_ID,
      asset_id: raifClassA,
      from_id: pieterId,
      to_id: chenId,
      units: 25000,
      decision_record_id: null,
      fromName: 'Pieter van Dijk',
      toName: 'Chen Wei Investment Ltd',
      assetName: 'RAIF Class A',
    },
    // TR6: Hans Weber → Isabella Rossi, Gamma Class A, 50000 units (executed)
    {
      id: TR6_ID,
      asset_id: gammaClassA,
      from_id: hansId,
      to_id: isabellaId,
      units: 50000,
      decision_record_id: null,
      fromName: 'Hans Weber',
      toName: 'Isabella Rossi',
      assetName: 'Gamma Class A',
    },
    // TR7: Chen Wei → Hans Weber, RAIF Class A, 10000 units (executed, linked to DR10)
    {
      id: TR7_ID,
      asset_id: raifClassA,
      from_id: chenId,
      to_id: hansId,
      units: 10000,
      decision_record_id: DR10_ID,
      fromName: 'Chen Wei Investment Ltd',
      toName: 'Hans Weber',
      assetName: 'RAIF Class A',
    },
    // TR8: Nordic Fund → Dr. Sarah Bennett, Gamma Class B, 100000 units (executed)
    {
      id: TR8_ID,
      asset_id: gammaClassB,
      from_id: nordicId,
      to_id: sarahId,
      units: 100000,
      decision_record_id: null,
      fromName: 'Nordic Fund Solutions',
      toName: 'Dr. Sarah Bennett',
      assetName: 'Gamma Class B',
    },
  ];

  for (const tr of transfers) {
    if (await exists('transfers', tr.id)) {
      console.log(`  → Transfer ${tr.fromName} → ${tr.toName} (${tr.assetName}) already exists`);
    } else {
      await execute(
        `INSERT INTO transfers
           (id, asset_id, from_investor_id, to_investor_id, units, decision_record_id, executed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
        [tr.id, tr.asset_id, tr.from_id, tr.to_id, tr.units, tr.decision_record_id]
      );
      console.log(`  ✓ Transfer: ${tr.fromName} → ${tr.toName}: ${tr.units.toLocaleString()} ${tr.assetName} units`);
    }
  }

  // =========================================================================
  // 10. Events (audit trail for key operations)
  // =========================================================================
  console.log('\n[Events]');

  const events: Array<{
    event_type: string;
    entity_type: string;
    entity_id: string;
    payload: Record<string, unknown>;
    label: string;
  }> = [
    // Investor created events (new investors only)
    { event_type: 'investor.created', entity_type: 'investor', entity_id: hansId,     payload: { name: 'Hans Weber', jurisdiction: 'DE', investor_type: 'semi_professional' }, label: 'Hans Weber created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: isabellaId, payload: { name: 'Isabella Rossi', jurisdiction: 'IT', investor_type: 'professional' }, label: 'Isabella Rossi created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: dublinId,   payload: { name: 'Dublin Capital Partners', jurisdiction: 'IE', investor_type: 'institutional' }, label: 'Dublin Capital Partners created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: zurichId,   payload: { name: 'Zürich Wealth AG', jurisdiction: 'CH', investor_type: 'institutional' }, label: 'Zürich Wealth AG created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: chenId,     payload: { name: 'Chen Wei Investment Ltd', jurisdiction: 'SG', investor_type: 'professional' }, label: 'Chen Wei Investment Ltd created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: annaId,     payload: { name: 'Anna Kowalski', jurisdiction: 'PL', investor_type: 'retail' }, label: 'Anna Kowalski created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: nordicId,   payload: { name: 'Nordic Fund Solutions', jurisdiction: 'NO', investor_type: 'institutional' }, label: 'Nordic Fund Solutions created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: miguelId,   payload: { name: 'Miguel Santos', jurisdiction: 'PT', investor_type: 'semi_professional' }, label: 'Miguel Santos created' },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: sarahId,    payload: { name: 'Dr. Sarah Bennett', jurisdiction: 'GB', investor_type: 'professional' }, label: 'Dr. Sarah Bennett created' },

    // Fund structure created
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: GAMMA_ID, payload: { name: 'German Spezial-AIF Gamma', legal_form: 'Spezial_AIF', domicile: 'DE' }, label: 'Gamma fund created' },

    // Asset created events
    { event_type: 'asset.created', entity_type: 'asset', entity_id: gammaClassA, payload: { name: 'Spezial-AIF Gamma Class A', total_units: 1500000, fund: GAMMA_ID }, label: 'Gamma Class A asset created' },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: gammaClassB, payload: { name: 'Spezial-AIF Gamma Class B', total_units: 5000000, fund: GAMMA_ID }, label: 'Gamma Class B asset created' },

    // Holding created events (selected key holdings)
    { event_type: 'holding.created', entity_type: 'holding', entity_id: hansId,    payload: { investor: 'Hans Weber', asset: 'Gamma Class A', units: 400000, concentration_pct: 26.7 }, label: 'Hans Weber Gamma A holding' },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: zurichId,  payload: { investor: 'Zürich Wealth AG', asset: 'Gamma Class B', units: 2000000, concentration_pct: 40.0 }, label: 'Zürich Wealth Gamma B holding' },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: dublinId,  payload: { investor: 'Dublin Capital Partners', asset: 'SIF Class A', units: 200000 }, label: 'Dublin Capital SIF A holding' },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: nordicId,  payload: { investor: 'Nordic Fund Solutions', asset: 'Gamma Class A', units: 300000 }, label: 'Nordic Fund Gamma A holding' },

    // Onboarding events
    { event_type: 'onboarding.created', entity_type: 'onboarding_record', entity_id: OB1_ID, payload: { investor: 'Anna Kowalski', asset: 'Gamma Class A', units: 50000, status: 'applied' }, label: 'Anna Kowalski onboarding' },
    { event_type: 'onboarding.created', entity_type: 'onboarding_record', entity_id: OB2_ID, payload: { investor: 'Miguel Santos', asset: 'Gamma Class B', units: 200000, status: 'applied' }, label: 'Miguel Santos onboarding' },
    { event_type: 'onboarding.created', entity_type: 'onboarding_record', entity_id: OB3_ID, payload: { investor: 'Hans Weber', asset: 'SIF Class A', units: 100000, status: 'eligible' }, label: 'Hans Weber onboarding' },
    { event_type: 'onboarding.status_changed', entity_type: 'onboarding_record', entity_id: OB4_ID, payload: { investor: 'Isabella Rossi', asset: 'Gamma Class A', units: 200000, status: 'approved', previous_status: 'eligible' }, label: 'Isabella Rossi onboarding approved' },
    { event_type: 'onboarding.status_changed', entity_type: 'onboarding_record', entity_id: OB5_ID, payload: { investor: 'Chen Wei Investment Ltd', asset: 'Gamma Class B', units: 500000, status: 'allocated', previous_status: 'approved' }, label: 'Chen Wei onboarding allocated' },
    { event_type: 'onboarding.rejected', entity_type: 'onboarding_record', entity_id: OB6_ID, payload: { investor: 'Dr. Sarah Bennett', asset: 'SIF Class B', units: 50000, status: 'rejected', reasons: ['KAGB §1(19) Nr. 33 minimum not met'] }, label: 'Dr. Sarah Bennett onboarding rejected' },

    // Transfer executed events
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR1_ID, payload: { from: 'Marie Laurent', to: 'Klaus Schmidt', asset: 'SIF Class A', units: 20000 }, label: 'Transfer Marie→Klaus' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR2_ID, payload: { from: 'Acme Capital Partners', to: 'Sophie Dubois', asset: 'RAIF Class A', units: 50000 }, label: 'Transfer Acme→Sophie' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR3_ID, payload: { from: 'Zürich Wealth AG', to: 'Nordic Fund Solutions', asset: 'Gamma Class B', units: 150000 }, label: 'Transfer Zürich→Nordic' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR4_ID, payload: { from: 'Erik Nordström', to: 'Dublin Capital Partners', asset: 'SIF Class A', units: 30000 }, label: 'Transfer Erik→Dublin' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR5_ID, payload: { from: 'Pieter van Dijk', to: 'Chen Wei Investment Ltd', asset: 'RAIF Class A', units: 25000 }, label: 'Transfer Pieter→Chen Wei' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR6_ID, payload: { from: 'Hans Weber', to: 'Isabella Rossi', asset: 'Gamma Class A', units: 50000 }, label: 'Transfer Hans→Isabella' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR7_ID, payload: { from: 'Chen Wei Investment Ltd', to: 'Hans Weber', asset: 'RAIF Class A', units: 10000 }, label: 'Transfer Chen Wei→Hans' },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR8_ID, payload: { from: 'Nordic Fund Solutions', to: 'Dr. Sarah Bennett', asset: 'Gamma Class B', units: 100000 }, label: 'Transfer Nordic→Sarah' },

    // Decision record events
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR1_ID, payload: { type: 'eligibility_check', result: 'approved', subject: 'Isabella Rossi', asset: 'SIF Class B' }, label: 'Decision DR1' },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR4_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Anna Kowalski', asset: 'Gamma Class A', violations: 2 }, label: 'Decision DR4 (rejected)' },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR5_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Miguel Santos', asset: 'Gamma Class B', violations: 2 }, label: 'Decision DR5 (rejected)' },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR8_ID, payload: { type: 'scenario_analysis', result: 'simulated', subject: 'Acme Capital Partners', asset: 'SIF Class A', recommendation: 'Cap additional subscription' }, label: 'Decision DR8 (scenario)' },
  ];

  for (const evt of events) {
    // Check for duplicate events by type + entity
    const existing = await query(
      `SELECT 1 FROM events WHERE event_type = $1 AND entity_type = $2 AND entity_id = $3 LIMIT 1`,
      [evt.event_type, evt.entity_type, evt.entity_id]
    );
    if (existing.length > 0) {
      console.log(`  → Event "${evt.label}" already exists`);
    } else {
      await execute(
        `INSERT INTO events (id, event_type, entity_type, entity_id, payload, timestamp)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
        [evt.event_type, evt.entity_type, evt.entity_id, JSON.stringify(evt.payload)]
      );
      console.log(`  ✓ Event: ${evt.label}`);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n========================================');
  console.log('  Demo seed complete!');
  console.log('========================================');
  console.log('  3 fund structures (SIF + RAIF + Gamma Spezial-AIF)');
  console.log('  9 eligibility criteria (3 per fund)');
  console.log('  5 assets (2 SIF classes, 1 RAIF class, 2 Gamma classes)');
  console.log('  5 rules (permissive)');
  console.log('  15 investors (professional, semi_professional, institutional, retail)');
  console.log('  18 holdings (distributed across 5 assets)');
  console.log('  10 decision records (approved, rejected, simulated)');
  console.log('  6 onboarding records (applied, eligible, approved, allocated, rejected)');
  console.log('  8 transfers (5 executed + 3 with decision links)');
  console.log('  35 events (audit trail)');
  console.log('========================================');
  console.log('\nRisk flags for demo:');
  console.log('  - Klaus Schmidt: KYC expires 2026-05-15 (within 90 days)');
  console.log('  - Miguel Santos: KYC expired 2025-11-30 (needs renewal)');
  console.log('  - Anna Kowalski: KYC pending (retail, not eligible for Spezial-AIF)');
  console.log('  - Acme Capital: 40% concentration in SIF Class A');
  console.log('  - Hans Weber: 26.7% concentration in Gamma Class A');
  console.log('  - Zürich Wealth: 40% concentration in Gamma Class B');
  console.log('  - Isabella Rossi: 30% concentration in SIF Class B');
  console.log('  - Pieter van Dijk: 30% concentration in RAIF Class A');
  console.log('========================================');

  const sealed = await sealAllUnsealed();
  console.log(`\nSealed ${sealed} decision records`);
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
