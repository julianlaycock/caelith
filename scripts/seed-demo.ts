/**
 * Seed Demo Data — Full showcase across 5 fund structures
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING or check-before-insert
 * patterns throughout. Safe to run multiple times and on every deploy.
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
const SIF_ID     = '00000000-0000-0000-0000-000000000001';
const RAIF_ID    = '00000000-0000-0000-0000-000000000002';
const GAMMA_ID   = '10000000-0000-0000-0000-000000000003';
const DELTA_ID   = '00000000-0000-0000-0000-000000000004';
const EPSILON_ID = '00000000-0000-0000-0000-000000000005';

// Assets (10 total — 2 per fund)
const SIF_A_ID     = '20000000-0000-0000-0000-000000000001';
const SIF_B_ID     = '20000000-0000-0000-0000-000000000002';
const RAIF_A_ID    = '20000000-0000-0000-0000-000000000003';
const RAIF_F_ID    = '20000000-0000-0000-0000-000000000006';
const GAMMA_A_ID   = '20000000-0000-0000-0000-000000000004';
const GAMMA_B_ID   = '20000000-0000-0000-0000-000000000005';
const DELTA_I_ID   = '20000000-0000-0000-0000-000000000007';
const DELTA_B_ID   = '20000000-0000-0000-0000-000000000008';
const EPSILON_R_ID = '20000000-0000-0000-0000-000000000009';
const EPSILON_P_ID = '20000000-0000-0000-0000-000000000010';

// Investors (25 total — 7 reused from v1, 18 new)
// Reused UUIDs (same name + type as before):
const KLAUS_ID   = '30000000-0000-0000-0000-000000000002';
const ERIK_ID    = '30000000-0000-0000-0000-000000000005';
const HANS_ID    = '30000000-0000-0000-0000-000000000007';
const DUBLIN_ID  = '30000000-0000-0000-0000-000000000009';
const CHEN_ID    = '30000000-0000-0000-0000-000000000011';
const ANNA_ID    = '30000000-0000-0000-0000-000000000012';
const SARAH_ID   = '30000000-0000-0000-0000-000000000015';
// New UUIDs:
const CALPERS_ID    = '31000000-0000-0000-0000-000000000001';
const NORGES_ID     = '31000000-0000-0000-0000-000000000002';
const ALLIANZ_ID    = '31000000-0000-0000-0000-000000000003';
const TEMASEK_ID    = '31000000-0000-0000-0000-000000000004';
const ROTHSCHILD_ID = '31000000-0000-0000-0000-000000000005';
const BAILLIE_ID    = '31000000-0000-0000-0000-000000000006';
const LOMBARD_ID    = '31000000-0000-0000-0000-000000000007';
const TIKEHAU_ID    = '31000000-0000-0000-0000-000000000008';
const MUELLER_ID    = '31000000-0000-0000-0000-000000000009';
const VANDERBERG_ID = '31000000-0000-0000-0000-000000000010';
const SOFIA_ID      = '31000000-0000-0000-0000-000000000011';
const HENRIK_ID     = '31000000-0000-0000-0000-000000000012';
const MARGARET_ID   = '31000000-0000-0000-0000-000000000013';
const THOMAS_ID     = '31000000-0000-0000-0000-000000000014';
const AMELIE_ID     = '31000000-0000-0000-0000-000000000015';
const LIWEI_ID      = '31000000-0000-0000-0000-000000000016';
const MARIE_ID      = '31000000-0000-0000-0000-000000000017';
const MIGUEL_ID     = '31000000-0000-0000-0000-000000000018';

// Onboarding Records (18)
const OB1_ID  = '40000000-0000-0000-0000-000000000001';
const OB2_ID  = '40000000-0000-0000-0000-000000000002';
const OB3_ID  = '40000000-0000-0000-0000-000000000003';
const OB4_ID  = '40000000-0000-0000-0000-000000000004';
const OB5_ID  = '40000000-0000-0000-0000-000000000005';
const OB6_ID  = '40000000-0000-0000-0000-000000000006';
const OB7_ID  = '40000000-0000-0000-0000-000000000007';
const OB8_ID  = '40000000-0000-0000-0000-000000000008';
const OB9_ID  = '40000000-0000-0000-0000-000000000009';
const OB10_ID = '40000000-0000-0000-0000-000000000010';
const OB11_ID = '40000000-0000-0000-0000-000000000011';
const OB12_ID = '40000000-0000-0000-0000-000000000012';
const OB13_ID = '40000000-0000-0000-0000-000000000013';
const OB14_ID = '40000000-0000-0000-0000-000000000014';
const OB15_ID = '40000000-0000-0000-0000-000000000015';
const OB16_ID = '40000000-0000-0000-0000-000000000016';
const OB17_ID = '40000000-0000-0000-0000-000000000017';
const OB18_ID = '40000000-0000-0000-0000-000000000018';

// Decision Records (25)
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
const DR11_ID = '50000000-0000-0000-0000-000000000011';
const DR12_ID = '50000000-0000-0000-0000-000000000012';
const DR13_ID = '50000000-0000-0000-0000-000000000013';
const DR14_ID = '50000000-0000-0000-0000-000000000014';
const DR15_ID = '50000000-0000-0000-0000-000000000015';
const DR16_ID = '50000000-0000-0000-0000-000000000016';
const DR17_ID = '50000000-0000-0000-0000-000000000017';
const DR18_ID = '50000000-0000-0000-0000-000000000018';
const DR19_ID = '50000000-0000-0000-0000-000000000019';
const DR20_ID = '50000000-0000-0000-0000-000000000020';
const DR21_ID = '50000000-0000-0000-0000-000000000021';
const DR22_ID = '50000000-0000-0000-0000-000000000022';
const DR23_ID = '50000000-0000-0000-0000-000000000023';
const DR24_ID = '50000000-0000-0000-0000-000000000024';
const DR25_ID = '50000000-0000-0000-0000-000000000025';

// Transfers (14)
const TR1_ID  = '60000000-0000-0000-0000-000000000001';
const TR2_ID  = '60000000-0000-0000-0000-000000000002';
const TR3_ID  = '60000000-0000-0000-0000-000000000003';
const TR4_ID  = '60000000-0000-0000-0000-000000000004';
const TR5_ID  = '60000000-0000-0000-0000-000000000005';
const TR6_ID  = '60000000-0000-0000-0000-000000000006';
const TR7_ID  = '60000000-0000-0000-0000-000000000007';
const TR8_ID  = '60000000-0000-0000-0000-000000000008';
const TR9_ID  = '60000000-0000-0000-0000-000000000009';
const TR10_ID = '60000000-0000-0000-0000-000000000010';
const TR11_ID = '60000000-0000-0000-0000-000000000011';
const TR12_ID = '60000000-0000-0000-0000-000000000012';
const TR13_ID = '60000000-0000-0000-0000-000000000013';
const TR14_ID = '60000000-0000-0000-0000-000000000014';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function exists(table: string, id: string): Promise<boolean> {
  const rows = await query('SELECT 1 FROM ' + table + ' WHERE id = $1', [id]);
  return rows.length > 0;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
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
  console.log('Seeding demo data — 5 fund structures, full showcase...\n');

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

  const retiredDemoUsers = [
    'test1@caelith.com', 'test2@caelith.com',
    'demo1@caelith.com', 'demo2@caelith.com',
    'viewer@caelith.com',
  ];
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
    { email: 'admin@caelith.com',      password: 'Admin1234',    name: 'System Admin',       role: 'admin' },
    { email: 'compliance@caelith.com',  password: 'Compliance1!', name: 'Compliance Officer',  role: 'compliance_officer' },
    { email: 'ops@caelith.com',         password: 'Ops12345!',    name: 'Operations Manager',  role: 'admin' },
    { email: 'demo@caelith.com',        password: 'Demo1234!',    name: 'Demo Viewer',         role: 'viewer' },
    { email: 'investor@caelith.com',    password: 'Investor1!',   name: 'Investor Portal',     role: 'viewer' },
  ];

  for (const user of demoUsers) {
    await ensureUser(user.email, user.password, user.name, user.role);
  }

  // =========================================================================
  // 1. Fund Structures (5 funds — fixed UUIDs)
  // =========================================================================
  console.log('\n[Fund Structures]');

  const funds = [
    { id: SIF_ID,     name: 'Meridian SIF Alpha',            legal_form: 'SIF',         domicile: 'LU', framework: 'AIFMD', aifm_name: 'Meridian Capital Management',   target_size: 50000000 },
    { id: RAIF_ID,    name: 'Evergreen RAIF Beta',           legal_form: 'RAIF',        domicile: 'LU', framework: 'AIFMD', aifm_name: 'Evergreen Fund Services',       target_size: 100000000 },
    { id: GAMMA_ID,   name: 'Rhine Spezial-AIF Gamma',       legal_form: 'Spezial_AIF', domicile: 'DE', framework: 'AIFMD', aifm_name: 'Caelith Asset Management GmbH', target_size: 75000000 },
    { id: DELTA_ID,   name: 'Atlantic QIAIF Delta',          legal_form: 'QIAIF',       domicile: 'IE', framework: 'AIFMD', aifm_name: 'Atlantic Fund Management',      target_size: 120000000 },
    { id: EPSILON_ID, name: 'Horizon ELTIF 2.0 Epsilon',     legal_form: 'ELTIF',       domicile: 'LU', framework: 'ELTIF', aifm_name: 'Horizon Alternatives',          target_size: 200000000 },
  ];

  for (const f of funds) {
    if (await exists('fund_structures', f.id)) {
      console.log(`  → ${f.name} already exists`);
    } else {
      await execute(
        `INSERT INTO fund_structures
           (id, name, legal_form, domicile, regulatory_framework, aifm_name, target_size, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'EUR', 'active', now(), now())`,
        [f.id, f.name, f.legal_form, f.domicile, f.framework, f.aifm_name, f.target_size]
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
    { fs: SIF_ID,     type: 'professional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,     type: 'semi_professional',  min: 12500000, suit: true,  src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: SIF_ID,     type: 'institutional',      min: 0,        suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    // RAIF criteria
    { fs: RAIF_ID,    type: 'professional',       min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID,    type: 'semi_professional',  min: 12500000, suit: true,  src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: RAIF_ID,    type: 'institutional',      min: 0,        suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    // Gamma (German Spezial-AIF) criteria
    { fs: GAMMA_ID,   type: 'professional',       min: 0,        suit: false, src: 'KAGB §1(6)' },
    { fs: GAMMA_ID,   type: 'semi_professional',  min: 20000000, suit: true,  src: 'KAGB §1(19) Nr. 33 — €200,000 minimum' },
    { fs: GAMMA_ID,   type: 'institutional',      min: 0,        suit: false, src: 'KAGB §1(6)' },
    // QIAIF criteria (professional + institutional only)
    { fs: DELTA_ID,   type: 'professional',       min: 10000000, suit: false, src: 'Central Bank (Supervision and Enforcement) Act 2013, S.I. No. 257/2013' },
    { fs: DELTA_ID,   type: 'institutional',      min: 0,        suit: false, src: 'Central Bank (Supervision and Enforcement) Act 2013, S.I. No. 257/2013' },
    // ELTIF 2.0 criteria (all 5 tiers — retail needs suitability)
    { fs: EPSILON_ID, type: 'institutional',      min: 0,        suit: false, src: 'Reg (EU) 2015/760 as amended by Reg 2023/606, Art. 30' },
    { fs: EPSILON_ID, type: 'professional',       min: 0,        suit: false, src: 'Reg (EU) 2015/760 as amended by Reg 2023/606, Art. 30' },
    { fs: EPSILON_ID, type: 'semi_professional',  min: 0,        suit: true,  src: 'Reg (EU) 2015/760 as amended by Reg 2023/606, Art. 30' },
    { fs: EPSILON_ID, type: 'well_informed',      min: 0,        suit: true,  src: 'Reg (EU) 2015/760 as amended by Reg 2023/606, Art. 30' },
    { fs: EPSILON_ID, type: 'retail',             min: 0,        suit: true,  src: 'Reg (EU) 2015/760 as amended by Reg 2023/606, Art. 30a' },
  ];

  const fundLabel = (id: string) => {
    if (id === SIF_ID) return 'SIF';
    if (id === RAIF_ID) return 'RAIF';
    if (id === GAMMA_ID) return 'Gamma';
    if (id === DELTA_ID) return 'QIAIF';
    if (id === EPSILON_ID) return 'ELTIF';
    return 'Unknown';
  };

  for (const c of criteria) {
    const label = fundLabel(c.fs);
    const existing = await query(
      `SELECT 1 FROM eligibility_criteria
       WHERE fund_structure_id = $1 AND investor_type = $2 AND jurisdiction = '*' AND superseded_at IS NULL`,
      [c.fs, c.type]
    );
    if (existing.length > 0) {
      console.log(`  → ${c.type} for ${label} already exists`);
    } else {
      await execute(
        `INSERT INTO eligibility_criteria
           (id, fund_structure_id, jurisdiction, investor_type, minimum_investment,
            suitability_required, documentation_required, source_reference, effective_date, created_at)
         VALUES (gen_random_uuid(), $1, '*', $2, $3, $4, '[]', $5, CURRENT_DATE, now())`,
        [c.fs, c.type, c.min, c.suit, c.src]
      );
      console.log(`  ✓ Created ${c.type} criteria for ${label} (min: €${(c.min / 100).toLocaleString()})`);
    }
  }

  // =========================================================================
  // 3. Assets (10 total — 2 per fund, fixed UUIDs)
  // =========================================================================
  console.log('\n[Assets]');

  const assets = [
    { id: SIF_A_ID,     name: 'SIF Alpha Class A',       fs: SIF_ID,     type: 'Fund',      units: 1000000, price: 100.0 },
    { id: SIF_B_ID,     name: 'SIF Alpha Class B',       fs: SIF_ID,     type: 'Fund',      units: 500000,  price: 1000.0 },
    { id: RAIF_A_ID,    name: 'RAIF Beta Class A',       fs: RAIF_ID,    type: 'Fund',      units: 2000000, price: 50.0 },
    { id: RAIF_F_ID,    name: 'RAIF Beta Feeder',        fs: RAIF_ID,    type: 'Fund',      units: 500000,  price: 100.0 },
    { id: GAMMA_A_ID,   name: 'Spezial Gamma Class A',   fs: GAMMA_ID,   type: 'fund_unit', units: 1500000, price: 100.0 },
    { id: GAMMA_B_ID,   name: 'Spezial Gamma Class B',   fs: GAMMA_ID,   type: 'fund_unit', units: 3000000, price: 1000.0 },
    { id: DELTA_I_ID,   name: 'QIAIF Delta Inst',        fs: DELTA_ID,   type: 'Fund',      units: 750000,  price: 200.0 },
    { id: DELTA_B_ID,   name: 'QIAIF Delta Class B',     fs: DELTA_ID,   type: 'Fund',      units: 250000,  price: 500.0 },
    { id: EPSILON_R_ID, name: 'ELTIF Epsilon Retail',     fs: EPSILON_ID, type: 'Fund',      units: 5000000, price: 10.0 },
    { id: EPSILON_P_ID, name: 'ELTIF Epsilon Pro',        fs: EPSILON_ID, type: 'Fund',      units: 1000000, price: 100.0 },
  ];

  for (const a of assets) {
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

  const sifClassA    = await resolveAssetId(SIF_A_ID,     'SIF Alpha Class A');
  const sifClassB    = await resolveAssetId(SIF_B_ID,     'SIF Alpha Class B');
  const raifClassA   = await resolveAssetId(RAIF_A_ID,    'RAIF Beta Class A');
  const raifFeeder   = await resolveAssetId(RAIF_F_ID,    'RAIF Beta Feeder');
  const gammaClassA  = await resolveAssetId(GAMMA_A_ID,   'Spezial Gamma Class A');
  const gammaClassB  = await resolveAssetId(GAMMA_B_ID,   'Spezial Gamma Class B');
  const deltaInst    = await resolveAssetId(DELTA_I_ID,   'QIAIF Delta Inst');
  const deltaClassB  = await resolveAssetId(DELTA_B_ID,   'QIAIF Delta Class B');
  const eltifRetail  = await resolveAssetId(EPSILON_R_ID, 'ELTIF Epsilon Retail');
  const eltifPro     = await resolveAssetId(EPSILON_P_ID, 'ELTIF Epsilon Pro');

  // =========================================================================
  // 4. Rules (permissive defaults, one per asset)
  // =========================================================================
  console.log('\n[Rules]');

  const allAssets = [
    { id: sifClassA,   name: 'SIF Class A' },
    { id: sifClassB,   name: 'SIF Class B' },
    { id: raifClassA,  name: 'RAIF Class A' },
    { id: raifFeeder,  name: 'RAIF Feeder' },
    { id: gammaClassA, name: 'Gamma Class A' },
    { id: gammaClassB, name: 'Gamma Class B' },
    { id: deltaInst,   name: 'QIAIF Inst' },
    { id: deltaClassB, name: 'QIAIF Class B' },
    { id: eltifRetail, name: 'ELTIF Retail' },
    { id: eltifPro,    name: 'ELTIF Pro' },
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
  // 5. Investors (25 total — all 5 AIFMD tiers)
  // =========================================================================
  console.log('\n[Investors]');

  const investors = [
    // ── Institutional (5) — all verified ──
    { id: CALPERS_ID,    name: 'CalPERS',                          jur: 'US', type: 'institutional',     kyc: 'verified', expiry: '2028-12-31', accredited: true },
    { id: NORGES_ID,     name: 'Norges Bank Investment Management', jur: 'NO', type: 'institutional',    kyc: 'verified', expiry: '2028-06-30', accredited: true },
    { id: ALLIANZ_ID,    name: 'Allianz Global Investors',         jur: 'DE', type: 'institutional',     kyc: 'verified', expiry: '2027-09-15', accredited: true },
    { id: TEMASEK_ID,    name: 'Temasek Holdings',                 jur: 'SG', type: 'institutional',     kyc: 'verified', expiry: '2028-03-31', accredited: true },
    { id: DUBLIN_ID,     name: 'Dublin Capital Partners',          jur: 'IE', type: 'institutional',     kyc: 'verified', expiry: '2027-11-30', accredited: true },

    // ── Professional (6) — Baillie Gifford KYC expiring ~60d ──
    { id: ROTHSCHILD_ID, name: 'Rothschild & Co Wealth Management', jur: 'CH', type: 'professional',    kyc: 'verified', expiry: '2027-06-30', accredited: true },
    { id: BAILLIE_ID,    name: 'Baillie Gifford & Co',             jur: 'GB', type: 'professional',     kyc: 'verified', expiry: '2026-04-16', accredited: true },
    { id: LOMBARD_ID,    name: 'Lombard Odier Group',              jur: 'CH', type: 'professional',     kyc: 'verified', expiry: '2027-12-31', accredited: true },
    { id: TIKEHAU_ID,    name: 'Tikehau Capital',                  jur: 'FR', type: 'professional',     kyc: 'verified', expiry: '2027-08-15', accredited: true },
    { id: CHEN_ID,       name: 'Chen Wei Investment Ltd',          jur: 'SG', type: 'professional',     kyc: 'verified', expiry: '2027-04-30', accredited: true },
    { id: SARAH_ID,      name: 'Dr. Sarah Bennett',               jur: 'GB', type: 'professional',     kyc: 'verified', expiry: '2027-01-20', accredited: true },

    // ── Semi-Professional (5) — Van der Berg expired, Mueller expiring ~75d ──
    { id: KLAUS_ID,      name: 'Klaus Schmidt',                    jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2027-03-15', accredited: true },
    { id: ERIK_ID,       name: 'Erik Nordström',                   jur: 'NO', type: 'semi_professional', kyc: 'verified', expiry: '2027-05-20', accredited: true },
    { id: HANS_ID,       name: 'Hans Weber',                       jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2027-08-15', accredited: true },
    { id: MUELLER_ID,    name: 'Mueller Family Office',            jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: '2026-05-01', accredited: true },
    { id: VANDERBERG_ID, name: 'Van der Berg Holding',             jur: 'NL', type: 'semi_professional', kyc: 'expired',  expiry: '2025-10-15', accredited: true },

    // ── Well-Informed (3) — Henrik pending, Margaret expiring ~45d ──
    { id: SOFIA_ID,      name: 'Dr. Sofia Papadopoulos',          jur: 'GR', type: 'well_informed',    kyc: 'verified', expiry: '2027-04-30', accredited: true },
    { id: HENRIK_ID,     name: 'Henrik Lindqvist',                jur: 'SE', type: 'well_informed',    kyc: 'pending',  expiry: null,         accredited: false },
    { id: MARGARET_ID,   name: 'Margaret Chen-Williams',           jur: 'HK', type: 'well_informed',    kyc: 'verified', expiry: '2026-04-01', accredited: true },

    // ── Retail (6) — Li Wei expired, Anna pending, Miguel expired ──
    { id: THOMAS_ID,     name: 'Thomas Keller',                   jur: 'DE', type: 'retail',           kyc: 'verified', expiry: '2027-06-30', accredited: false },
    { id: AMELIE_ID,     name: 'Amelie Dubois',                   jur: 'FR', type: 'retail',           kyc: 'verified', expiry: '2027-09-15', accredited: false },
    { id: ANNA_ID,       name: 'Anna Kowalski',                   jur: 'PL', type: 'retail',           kyc: 'pending',  expiry: null,         accredited: false },
    { id: LIWEI_ID,      name: 'Li Wei Zhang',                    jur: 'CN', type: 'retail',           kyc: 'expired',  expiry: '2025-08-30', accredited: false },
    { id: MARIE_ID,      name: 'Marie Laurent',                   jur: 'FR', type: 'retail',           kyc: 'verified', expiry: '2027-12-31', accredited: false },
    { id: MIGUEL_ID,     name: 'Miguel Santos',                   jur: 'PT', type: 'retail',           kyc: 'expired',  expiry: '2025-11-30', accredited: false },
  ];

  for (const inv of investors) {
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

  // Resolve investor IDs: fixed UUID → name fallback
  async function resolveInvestorId(fixedId: string, name: string): Promise<string> {
    const byId = await query<{ id: string }>('SELECT id FROM investors WHERE id = $1', [fixedId]);
    if (byId.length > 0) return fixedId;
    const byName = await query<{ id: string }>('SELECT id FROM investors WHERE name = $1', [name]);
    if (byName.length > 0) return byName[0].id;
    throw new Error(`Investor not found: ${name} (${fixedId})`);
  }

  const calpersId    = await resolveInvestorId(CALPERS_ID,    'CalPERS');
  const norgesId     = await resolveInvestorId(NORGES_ID,     'Norges Bank Investment Management');
  const allianzId    = await resolveInvestorId(ALLIANZ_ID,    'Allianz Global Investors');
  const temasekId    = await resolveInvestorId(TEMASEK_ID,    'Temasek Holdings');
  const dublinId     = await resolveInvestorId(DUBLIN_ID,     'Dublin Capital Partners');
  const rothschildId = await resolveInvestorId(ROTHSCHILD_ID, 'Rothschild & Co Wealth Management');
  const baillieId    = await resolveInvestorId(BAILLIE_ID,    'Baillie Gifford & Co');
  const lombardId    = await resolveInvestorId(LOMBARD_ID,    'Lombard Odier Group');
  const tikehauId    = await resolveInvestorId(TIKEHAU_ID,    'Tikehau Capital');
  const chenId       = await resolveInvestorId(CHEN_ID,       'Chen Wei Investment Ltd');
  const sarahId      = await resolveInvestorId(SARAH_ID,      'Dr. Sarah Bennett');
  const klausId      = await resolveInvestorId(KLAUS_ID,      'Klaus Schmidt');
  const erikId       = await resolveInvestorId(ERIK_ID,       'Erik Nordström');
  const hansId       = await resolveInvestorId(HANS_ID,       'Hans Weber');
  const muellerId    = await resolveInvestorId(MUELLER_ID,    'Mueller Family Office');
  const vanderbergId = await resolveInvestorId(VANDERBERG_ID, 'Van der Berg Holding');
  const sofiaId      = await resolveInvestorId(SOFIA_ID,      'Dr. Sofia Papadopoulos');
  const henrikId     = await resolveInvestorId(HENRIK_ID,     'Henrik Lindqvist');
  const margaretId   = await resolveInvestorId(MARGARET_ID,   'Margaret Chen-Williams');
  const thomasId     = await resolveInvestorId(THOMAS_ID,     'Thomas Keller');
  const amelieId     = await resolveInvestorId(AMELIE_ID,     'Amelie Dubois');
  const annaId       = await resolveInvestorId(ANNA_ID,       'Anna Kowalski');
  const liweiId      = await resolveInvestorId(LIWEI_ID,      'Li Wei Zhang');
  const marieId      = await resolveInvestorId(MARIE_ID,      'Marie Laurent');
  const miguelId     = await resolveInvestorId(MIGUEL_ID,     'Miguel Santos');

  // =========================================================================
  // 6. Holdings (~46 total — strategic concentration patterns)
  // =========================================================================
  console.log('\n[Holdings]');

  const holdings = [
    // ── SIF Alpha Class A (1M units, ~70% util, well-diversified, HHI ~1200) ──
    { inv: calpersId,    invName: 'CalPERS',                 asset: sifClassA,   assetName: 'SIF A', units: 140000 },
    { inv: rothschildId, invName: 'Rothschild',              asset: sifClassA,   assetName: 'SIF A', units: 120000 },
    { inv: klausId,      invName: 'Klaus Schmidt',           asset: sifClassA,   assetName: 'SIF A', units: 110000 },
    { inv: dublinId,     invName: 'Dublin Capital',          asset: sifClassA,   assetName: 'SIF A', units: 100000 },
    { inv: baillieId,    invName: 'Baillie Gifford',         asset: sifClassA,   assetName: 'SIF A', units: 80000 },
    { inv: erikId,       invName: 'Erik Nordström',          asset: sifClassA,   assetName: 'SIF A', units: 60000 },
    { inv: thomasId,     invName: 'Thomas Keller',           asset: sifClassA,   assetName: 'SIF A', units: 50000 },
    { inv: sofiaId,      invName: 'Dr. Sofia Papadopoulos',  asset: sifClassA,   assetName: 'SIF A', units: 40000 },

    // ── SIF Alpha Class B (500K units, institutional-heavy) ──
    { inv: norgesId,     invName: 'Norges Bank',             asset: sifClassB,   assetName: 'SIF B', units: 90000 },
    { inv: allianzId,    invName: 'Allianz',                 asset: sifClassB,   assetName: 'SIF B', units: 80000 },
    { inv: lombardId,    invName: 'Lombard Odier',           asset: sifClassB,   assetName: 'SIF B', units: 70000 },
    { inv: sarahId,      invName: 'Dr. Sarah Bennett',       asset: sifClassB,   assetName: 'SIF B', units: 60000 },
    { inv: chenId,       invName: 'Chen Wei',                asset: sifClassB,   assetName: 'SIF B', units: 50000 },

    // ── RAIF Beta Class A (2M units, CONCENTRATED — Norges 55%, HIGH risk) ──
    { inv: norgesId,     invName: 'Norges Bank',             asset: raifClassA,  assetName: 'RAIF A', units: 1100000 },
    { inv: allianzId,    invName: 'Allianz',                 asset: raifClassA,  assetName: 'RAIF A', units: 340000 },
    { inv: temasekId,    invName: 'Temasek',                 asset: raifClassA,  assetName: 'RAIF A', units: 260000 },

    // ── RAIF Beta Feeder (500K units) ──
    { inv: rothschildId, invName: 'Rothschild',              asset: raifFeeder,  assetName: 'RAIF F', units: 150000 },
    { inv: tikehauId,    invName: 'Tikehau Capital',         asset: raifFeeder,  assetName: 'RAIF F', units: 125000 },
    { inv: dublinId,     invName: 'Dublin Capital',          asset: raifFeeder,  assetName: 'RAIF F', units: 100000 },
    { inv: chenId,       invName: 'Chen Wei',                asset: raifFeeder,  assetName: 'RAIF F', units: 50000 },

    // ── Spezial Gamma Class A (1.5M units, top inv 30%, MEDIUM risk, ~55% util) ──
    { inv: hansId,       invName: 'Hans Weber',              asset: gammaClassA, assetName: 'Gamma A', units: 450000 },
    { inv: muellerId,    invName: 'Mueller Family Office',   asset: gammaClassA, assetName: 'Gamma A', units: 200000 },
    { inv: klausId,      invName: 'Klaus Schmidt',           asset: gammaClassA, assetName: 'Gamma A', units: 100000 },
    { inv: erikId,       invName: 'Erik Nordström',          asset: gammaClassA, assetName: 'Gamma A', units: 75000 },

    // ── Spezial Gamma Class B (3M units, ~55% util) ──
    { inv: allianzId,    invName: 'Allianz',                 asset: gammaClassB, assetName: 'Gamma B', units: 600000 },
    { inv: dublinId,     invName: 'Dublin Capital',          asset: gammaClassB, assetName: 'Gamma B', units: 400000 },
    { inv: lombardId,    invName: 'Lombard Odier',           asset: gammaClassB, assetName: 'Gamma B', units: 350000 },
    { inv: temasekId,    invName: 'Temasek',                 asset: gammaClassB, assetName: 'Gamma B', units: 300000 },

    // ── QIAIF Delta Inst (750K units, CalPERS 35%, MEDIUM risk, ~75% util) ──
    { inv: calpersId,    invName: 'CalPERS',                 asset: deltaInst,   assetName: 'QIAIF Inst', units: 262000 },
    { inv: temasekId,    invName: 'Temasek',                 asset: deltaInst,   assetName: 'QIAIF Inst', units: 150000 },
    { inv: dublinId,     invName: 'Dublin Capital',          asset: deltaInst,   assetName: 'QIAIF Inst', units: 100000 },
    { inv: norgesId,     invName: 'Norges Bank',             asset: deltaInst,   assetName: 'QIAIF Inst', units: 50000 },

    // ── QIAIF Delta Class B (250K units, ~75% util) ──
    { inv: rothschildId, invName: 'Rothschild',              asset: deltaClassB, assetName: 'QIAIF B', units: 80000 },
    { inv: tikehauId,    invName: 'Tikehau Capital',         asset: deltaClassB, assetName: 'QIAIF B', units: 60000 },
    { inv: lombardId,    invName: 'Lombard Odier',           asset: deltaClassB, assetName: 'QIAIF B', units: 48000 },

    // ── ELTIF Epsilon Retail (5M units, broad retail, largest 12%, LOW risk, ~45% util) ──
    { inv: thomasId,     invName: 'Thomas Keller',           asset: eltifRetail, assetName: 'ELTIF R', units: 400000 },
    { inv: amelieId,     invName: 'Amelie Dubois',           asset: eltifRetail, assetName: 'ELTIF R', units: 350000 },
    { inv: marieId,      invName: 'Marie Laurent',           asset: eltifRetail, assetName: 'ELTIF R', units: 350000 },
    { inv: annaId,       invName: 'Anna Kowalski',           asset: eltifRetail, assetName: 'ELTIF R', units: 300000 },
    { inv: liweiId,      invName: 'Li Wei Zhang',            asset: eltifRetail, assetName: 'ELTIF R', units: 250000 },
    { inv: sofiaId,      invName: 'Dr. Sofia Papadopoulos',  asset: eltifRetail, assetName: 'ELTIF R', units: 200000 },
    { inv: margaretId,   invName: 'Margaret Chen-Williams',  asset: eltifRetail, assetName: 'ELTIF R', units: 200000 },
    { inv: henrikId,     invName: 'Henrik Lindqvist',        asset: eltifRetail, assetName: 'ELTIF R', units: 200000 },

    // ── ELTIF Epsilon Pro (1M units, ~45% util) ──
    { inv: tikehauId,    invName: 'Tikehau Capital',         asset: eltifPro,    assetName: 'ELTIF P', units: 200000 },
    { inv: sarahId,      invName: 'Dr. Sarah Bennett',       asset: eltifPro,    assetName: 'ELTIF P', units: 150000 },
    { inv: vanderbergId, invName: 'Van der Berg',            asset: eltifPro,    assetName: 'ELTIF P', units: 100000 },
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
  // 7. Decision Records (25 total — timestamps spread over 60 days)
  // =========================================================================
  console.log('\n[Decision Records]');

  const decisionRecords = [
    // ── APPROVED (13) ──
    // DR1: CalPERS eligibility for QIAIF
    {
      id: DR1_ID, decision_type: 'eligibility_check', asset_id: deltaInst, subject_id: calpersId, age: 58,
      input_snapshot: { investor_name: 'CalPERS', investor_type: 'institutional', jurisdiction: 'US', kyc_status: 'verified', requested_units: 262000 },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', legal_form: 'QIAIF', criteria_source: 'S.I. No. 257/2013', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Institutional investor eligible for QIAIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2028-12-31' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR2: Norges Bank eligibility for RAIF
    {
      id: DR2_ID, decision_type: 'eligibility_check', asset_id: raifClassA, subject_id: norgesId, age: 55,
      input_snapshot: { investor_name: 'Norges Bank Investment Management', investor_type: 'institutional', jurisdiction: 'NO', kyc_status: 'verified', requested_units: 1100000 },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', legal_form: 'RAIF', criteria_source: 'RAIF Law 23 Jul 2016, Art. 3', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Institutional investor eligible for RAIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2028-06-30' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR3: Transfer CalPERS → Temasek in QIAIF
    {
      id: DR3_ID, decision_type: 'transfer_validation', asset_id: deltaInst, subject_id: temasekId, age: 52,
      input_snapshot: { from_investor: 'CalPERS', to_investor: 'Temasek Holdings', units: 30000, asset: 'QIAIF Delta Inst' },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', lockup_days: 0, qualification_required: false },
      result: 'approved',
      result_details: { checks: [
        { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
        { rule: 'recipient_eligible', passed: true, message: 'Temasek is institutional, eligible for QIAIF' },
        { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR4: Rothschild eligibility for SIF
    {
      id: DR4_ID, decision_type: 'eligibility_check', asset_id: sifClassA, subject_id: rothschildId, age: 50,
      input_snapshot: { investor_name: 'Rothschild & Co Wealth Management', investor_type: 'professional', jurisdiction: 'CH', kyc_status: 'verified', requested_units: 120000 },
      rule_version_snapshot: { fund: 'Meridian SIF Alpha', legal_form: 'SIF', criteria_source: 'SIF Law 13 Feb 2007, Art. 2', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Professional investor eligible for SIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-06-30' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR5: Thomas Keller eligibility for ELTIF Retail
    {
      id: DR5_ID, decision_type: 'eligibility_check', asset_id: eltifRetail, subject_id: thomasId, age: 47,
      input_snapshot: { investor_name: 'Thomas Keller', investor_type: 'retail', jurisdiction: 'DE', kyc_status: 'verified', requested_units: 400000 },
      rule_version_snapshot: { fund: 'Horizon ELTIF 2.0 Epsilon', legal_form: 'ELTIF', criteria_source: 'Reg 2023/606, Art. 30a', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Retail investor eligible for ELTIF 2.0' },
        { rule: 'suitability_assessment', passed: true, message: 'Suitability assessment completed' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-06-30' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR6: Transfer Rothschild → Tikehau in RAIF Feeder
    {
      id: DR6_ID, decision_type: 'transfer_validation', asset_id: raifFeeder, subject_id: tikehauId, age: 44,
      input_snapshot: { from_investor: 'Rothschild & Co', to_investor: 'Tikehau Capital', units: 30000, asset: 'RAIF Beta Feeder' },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', lockup_days: 0, qualification_required: false },
      result: 'approved',
      result_details: { checks: [
        { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
        { rule: 'recipient_eligible', passed: true, message: 'Tikehau Capital is professional, eligible for RAIF' },
        { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR7: Allianz eligibility for Gamma Class B
    {
      id: DR7_ID, decision_type: 'eligibility_check', asset_id: gammaClassB, subject_id: allianzId, age: 42,
      input_snapshot: { investor_name: 'Allianz Global Investors', investor_type: 'institutional', jurisdiction: 'DE', kyc_status: 'verified', requested_units: 600000 },
      rule_version_snapshot: { fund: 'Rhine Spezial-AIF Gamma', legal_form: 'Spezial_AIF', criteria_source: 'KAGB §1(6)', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Institutional investor eligible for Spezial-AIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-09-15' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR8: Transfer Hans → Mueller in Gamma A
    {
      id: DR8_ID, decision_type: 'transfer_validation', asset_id: gammaClassA, subject_id: muellerId, age: 39,
      input_snapshot: { from_investor: 'Hans Weber', to_investor: 'Mueller Family Office', units: 50000, asset: 'Spezial Gamma Class A' },
      rule_version_snapshot: { fund: 'Rhine Spezial-AIF Gamma', lockup_days: 0, qualification_required: false },
      result: 'approved',
      result_details: { checks: [
        { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
        { rule: 'recipient_eligible', passed: true, message: 'Mueller Family Office is semi_professional, eligible for Spezial-AIF' },
        { rule: 'minimum_investment', passed: true, message: 'Transfer meets €200,000 minimum for semi_professional' },
        { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR9: Temasek eligibility for QIAIF
    {
      id: DR9_ID, decision_type: 'eligibility_check', asset_id: deltaInst, subject_id: temasekId, age: 36,
      input_snapshot: { investor_name: 'Temasek Holdings', investor_type: 'institutional', jurisdiction: 'SG', kyc_status: 'verified', requested_units: 150000 },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', legal_form: 'QIAIF', criteria_source: 'S.I. No. 257/2013', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Institutional investor eligible for QIAIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2028-03-31' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR10: Transfer Norges → Allianz in RAIF A
    {
      id: DR10_ID, decision_type: 'transfer_validation', asset_id: raifClassA, subject_id: allianzId, age: 33,
      input_snapshot: { from_investor: 'Norges Bank Investment Management', to_investor: 'Allianz Global Investors', units: 50000, asset: 'RAIF Beta Class A' },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', lockup_days: 0, qualification_required: false },
      result: 'approved',
      result_details: { checks: [
        { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
        { rule: 'recipient_eligible', passed: true, message: 'Allianz is institutional, eligible for RAIF' },
        { rule: 'concentration_limit', passed: true, message: 'Post-transfer Norges concentration 52.5% — note: already concentrated' },
        { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR11: Dr. Sofia eligibility for ELTIF
    {
      id: DR11_ID, decision_type: 'eligibility_check', asset_id: eltifRetail, subject_id: sofiaId, age: 30,
      input_snapshot: { investor_name: 'Dr. Sofia Papadopoulos', investor_type: 'well_informed', jurisdiction: 'GR', kyc_status: 'verified', requested_units: 200000 },
      rule_version_snapshot: { fund: 'Horizon ELTIF 2.0 Epsilon', legal_form: 'ELTIF', criteria_source: 'Reg 2023/606, Art. 30', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Well-informed investor eligible for ELTIF 2.0' },
        { rule: 'suitability_assessment', passed: true, message: 'Suitability assessment completed' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-04-30' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR12: Lombard Odier eligibility for SIF B
    {
      id: DR12_ID, decision_type: 'eligibility_check', asset_id: sifClassB, subject_id: lombardId, age: 27,
      input_snapshot: { investor_name: 'Lombard Odier Group', investor_type: 'professional', jurisdiction: 'CH', kyc_status: 'verified', requested_units: 70000 },
      rule_version_snapshot: { fund: 'Meridian SIF Alpha', legal_form: 'SIF', criteria_source: 'SIF Law 13 Feb 2007, Art. 2', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Professional investor eligible for SIF' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-12-31' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR13: Transfer Thomas → Amelie in ELTIF Retail
    {
      id: DR13_ID, decision_type: 'transfer_validation', asset_id: eltifRetail, subject_id: amelieId, age: 24,
      input_snapshot: { from_investor: 'Thomas Keller', to_investor: 'Amelie Dubois', units: 50000, asset: 'ELTIF Epsilon Retail' },
      rule_version_snapshot: { fund: 'Horizon ELTIF 2.0 Epsilon', lockup_days: 0, qualification_required: false },
      result: 'approved',
      result_details: { checks: [
        { rule: 'lockup_period', passed: true, message: 'No lockup period restriction' },
        { rule: 'recipient_eligible', passed: true, message: 'Amelie Dubois is retail, eligible for ELTIF 2.0' },
        { rule: 'kyc_verified', passed: true, message: 'Both parties KYC verified' },
      ], overall: 'approved', violation_count: 0 },
    },

    // ── REJECTED (8) — drives Violations Bar Chart ──
    // DR14: Miguel rejected for RAIF — retail + expired KYC (2 violations)
    {
      id: DR14_ID, decision_type: 'eligibility_check', asset_id: raifClassA, subject_id: miguelId, age: 21,
      input_snapshot: { investor_name: 'Miguel Santos', investor_type: 'retail', jurisdiction: 'PT', kyc_status: 'expired', kyc_expiry: '2025-11-30', requested_units: 50000 },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', legal_form: 'RAIF', criteria_source: 'RAIF Law 23 Jul 2016, Art. 3', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: false, message: 'Retail investors not eligible for RAIF' },
        { rule: 'kyc_verified', passed: false, message: 'KYC expired since 2025-11-30, renewal required' },
      ], overall: 'rejected', violation_count: 2 },
    },
    // DR15: Henrik rejected for RAIF Feeder — pending KYC (1 violation)
    {
      id: DR15_ID, decision_type: 'eligibility_check', asset_id: raifFeeder, subject_id: henrikId, age: 19,
      input_snapshot: { investor_name: 'Henrik Lindqvist', investor_type: 'well_informed', jurisdiction: 'SE', kyc_status: 'pending', requested_units: 50000 },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', legal_form: 'RAIF', criteria_source: 'RAIF Law 23 Jul 2016, Art. 3', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Well-informed investor eligible for RAIF via SIF regime passporting' },
        { rule: 'kyc_verified', passed: false, message: 'KYC status is pending, must be verified before subscription' },
      ], overall: 'rejected', violation_count: 1 },
    },
    // DR16: Anna rejected for RAIF — retail + pending KYC (2 violations)
    {
      id: DR16_ID, decision_type: 'eligibility_check', asset_id: raifClassA, subject_id: annaId, age: 17,
      input_snapshot: { investor_name: 'Anna Kowalski', investor_type: 'retail', jurisdiction: 'PL', kyc_status: 'pending', requested_units: 50000 },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', legal_form: 'RAIF', criteria_source: 'RAIF Law 23 Jul 2016, Art. 3', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: false, message: 'Retail investors not eligible for RAIF' },
        { rule: 'kyc_verified', passed: false, message: 'KYC status is pending, must be verified' },
      ], overall: 'rejected', violation_count: 2 },
    },
    // DR17: Transfer Van der Berg → Miguel in RAIF rejected (3 violations)
    {
      id: DR17_ID, decision_type: 'transfer_validation', asset_id: raifClassA, subject_id: miguelId, age: 15,
      input_snapshot: { from_investor: 'Van der Berg Holding', to_investor: 'Miguel Santos', units: 20000, asset: 'RAIF Beta Class A' },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', lockup_days: 0, qualification_required: false },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'sender_kyc', passed: false, message: 'Sender KYC expired since 2025-10-15' },
        { rule: 'recipient_kyc', passed: false, message: 'Recipient KYC expired since 2025-11-30' },
        { rule: 'recipient_eligible', passed: false, message: 'Recipient is retail, not eligible for RAIF' },
      ], overall: 'rejected', violation_count: 3 },
    },
    // DR18: Li Wei rejected for QIAIF — expired KYC + retail (2 violations)
    {
      id: DR18_ID, decision_type: 'eligibility_check', asset_id: deltaInst, subject_id: liweiId, age: 13,
      input_snapshot: { investor_name: 'Li Wei Zhang', investor_type: 'retail', jurisdiction: 'CN', kyc_status: 'expired', kyc_expiry: '2025-08-30', requested_units: 100000 },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', legal_form: 'QIAIF', criteria_source: 'S.I. No. 257/2013', minimum_investment: 10000000 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: false, message: 'Retail investors not eligible for QIAIF — professional or institutional only' },
        { rule: 'kyc_verified', passed: false, message: 'KYC expired since 2025-08-30, renewal required' },
      ], overall: 'rejected', violation_count: 2 },
    },
    // DR19: Margaret rejected for QIAIF — well_informed not eligible (1 violation)
    {
      id: DR19_ID, decision_type: 'eligibility_check', asset_id: deltaInst, subject_id: margaretId, age: 11,
      input_snapshot: { investor_name: 'Margaret Chen-Williams', investor_type: 'well_informed', jurisdiction: 'HK', kyc_status: 'verified', requested_units: 50000 },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', legal_form: 'QIAIF', criteria_source: 'S.I. No. 257/2013', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: false, message: 'Well-informed investors not eligible for QIAIF — professional or institutional only' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2026-04-01' },
      ], overall: 'rejected', violation_count: 1 },
    },
    // DR20: Miguel rejected for SIF B — expired KYC (1 violation)
    {
      id: DR20_ID, decision_type: 'eligibility_check', asset_id: sifClassB, subject_id: miguelId, age: 9,
      input_snapshot: { investor_name: 'Miguel Santos', investor_type: 'retail', jurisdiction: 'PT', kyc_status: 'expired', kyc_expiry: '2025-11-30', requested_units: 30000 },
      rule_version_snapshot: { fund: 'Meridian SIF Alpha', legal_form: 'SIF', criteria_source: 'SIF Law 13 Feb 2007, Art. 2', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'kyc_verified', passed: false, message: 'KYC expired since 2025-11-30, renewal required before subscription' },
      ], overall: 'rejected', violation_count: 1 },
    },
    // DR21: Van der Berg rejected for ELTIF — expired KYC (1 violation)
    {
      id: DR21_ID, decision_type: 'eligibility_check', asset_id: eltifRetail, subject_id: vanderbergId, age: 7,
      input_snapshot: { investor_name: 'Van der Berg Holding', investor_type: 'semi_professional', jurisdiction: 'NL', kyc_status: 'expired', kyc_expiry: '2025-10-15', requested_units: 100000 },
      rule_version_snapshot: { fund: 'Horizon ELTIF 2.0 Epsilon', legal_form: 'ELTIF', criteria_source: 'Reg 2023/606, Art. 30', minimum_investment: 0 },
      result: 'rejected',
      result_details: { checks: [
        { rule: 'kyc_verified', passed: false, message: 'KYC expired since 2025-10-15, renewal required' },
      ], overall: 'rejected', violation_count: 1 },
    },

    // ── SCENARIO / SIMULATED (2) — concentration what-if analysis ──
    // DR22: Norges Bank concentration scenario in RAIF
    {
      id: DR22_ID, decision_type: 'scenario_analysis', asset_id: raifClassA, subject_id: norgesId, age: 5,
      input_snapshot: {
        scenario: 'Norges Bank acquires additional 200,000 units in RAIF Class A',
        current_holding: 1100000, proposed_additional: 200000, total_after: 1300000,
        total_units: 2000000, concentration_after: '65%',
      },
      rule_version_snapshot: { fund: 'Evergreen RAIF Beta', concentration_limit_pct: null, max_investors: null },
      result: 'simulated',
      result_details: { checks: [
        { rule: 'concentration_limit', passed: false, message: 'Post-acquisition concentration would be 65%, exceeding recommended 25% threshold' },
        { rule: 'diversification_risk', passed: false, message: 'Single investor would hold supermajority of share class' },
        { rule: 'investor_eligible', passed: true, message: 'Norges Bank is institutional, eligible for RAIF' },
      ], overall: 'rejected', violation_count: 2, recommendation: 'Consider capping additional subscription to maintain concentration below 60%' },
    },
    // DR23: CalPERS concentration scenario in QIAIF
    {
      id: DR23_ID, decision_type: 'scenario_analysis', asset_id: deltaInst, subject_id: calpersId, age: 3,
      input_snapshot: {
        scenario: 'CalPERS acquires additional 150,000 units in QIAIF Delta Inst',
        current_holding: 262000, proposed_additional: 150000, total_after: 412000,
        total_units: 750000, concentration_after: '54.9%',
      },
      rule_version_snapshot: { fund: 'Atlantic QIAIF Delta', concentration_limit_pct: null, max_investors: null },
      result: 'simulated',
      result_details: { checks: [
        { rule: 'concentration_limit', passed: false, message: 'Post-acquisition concentration would be 54.9%, exceeding recommended 25% threshold' },
        { rule: 'investor_eligible', passed: true, message: 'CalPERS is institutional, eligible for QIAIF' },
      ], overall: 'rejected', violation_count: 1, recommendation: 'Consider limiting additional subscription to 75,000 units to keep concentration under 45%' },
    },

    // ── ONBOARDING APPROVAL (2) ──
    // DR24: Hans Weber onboarding approved for Gamma A
    {
      id: DR24_ID, decision_type: 'onboarding_approval', asset_id: gammaClassA, subject_id: hansId, age: 2,
      input_snapshot: { investor_name: 'Hans Weber', investor_type: 'semi_professional', jurisdiction: 'DE', kyc_status: 'verified', requested_units: 450000 },
      rule_version_snapshot: { fund: 'Rhine Spezial-AIF Gamma', legal_form: 'Spezial_AIF', criteria_source: 'KAGB §1(19) Nr. 33', minimum_investment: 20000000 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Semi-professional investor eligible for Spezial-AIF' },
        { rule: 'minimum_investment', passed: true, message: 'Investment meets €200,000 minimum for semi_professional' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-08-15' },
      ], overall: 'approved', violation_count: 0 },
    },
    // DR25: Dr. Sofia onboarding approved for ELTIF
    {
      id: DR25_ID, decision_type: 'onboarding_approval', asset_id: eltifRetail, subject_id: sofiaId, age: 1,
      input_snapshot: { investor_name: 'Dr. Sofia Papadopoulos', investor_type: 'well_informed', jurisdiction: 'GR', kyc_status: 'verified', requested_units: 200000 },
      rule_version_snapshot: { fund: 'Horizon ELTIF 2.0 Epsilon', legal_form: 'ELTIF', criteria_source: 'Reg 2023/606, Art. 30', minimum_investment: 0 },
      result: 'approved',
      result_details: { checks: [
        { rule: 'investor_type_eligible', passed: true, message: 'Well-informed investor eligible for ELTIF 2.0' },
        { rule: 'suitability_assessment', passed: true, message: 'Suitability assessment completed' },
        { rule: 'kyc_verified', passed: true, message: 'KYC verified, expires 2027-04-30' },
      ], overall: 'approved', violation_count: 0 },
    },
  ];

  for (const dr of decisionRecords) {
    if (await exists('decision_records', dr.id)) {
      console.log(`  → Decision ${dr.id.slice(-2)} (${dr.decision_type}) already exists`);
    } else {
      const ts = daysAgo(dr.age);
      await execute(
        `INSERT INTO decision_records
           (id, decision_type, asset_id, subject_id, input_snapshot, rule_version_snapshot, result, result_details, decided_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [
          dr.id, dr.decision_type, dr.asset_id, dr.subject_id,
          JSON.stringify(dr.input_snapshot), JSON.stringify(dr.rule_version_snapshot),
          dr.result, JSON.stringify(dr.result_details), ts,
        ]
      );
      console.log(`  ✓ Decision ${dr.id.slice(-2)}: ${dr.decision_type} → ${dr.result} (${dr.age}d ago)`);
    }
  }

  // =========================================================================
  // 8. Onboarding Records (18 total)
  // =========================================================================
  console.log('\n[Onboarding Records]');

  const onboardingRecords = [
    // ── Applied (3) — awaiting review ──
    { id: OB1_ID,  investor_id: henrikId,  asset_id: raifFeeder,  status: 'applied',    requested_units: 50000,  elig: DR15_ID, appr: null, rej: null,                                                     invName: 'Henrik Lindqvist',  assetName: 'RAIF Feeder',  age: 18 },
    { id: OB2_ID,  investor_id: marieId,   asset_id: sifClassA,   status: 'applied',    requested_units: 80000,  elig: null,    appr: null, rej: null,                                                     invName: 'Marie Laurent',     assetName: 'SIF A',        age: 12 },
    { id: OB3_ID,  investor_id: erikId,    asset_id: deltaInst,   status: 'applied',    requested_units: 50000,  elig: null,    appr: null, rej: null,                                                     invName: 'Erik Nordström',    assetName: 'QIAIF Inst',   age: 6 },

    // ── Eligible (3) — passed eligibility, awaiting approval ──
    { id: OB4_ID,  investor_id: margaretId, asset_id: eltifRetail, status: 'eligible',  requested_units: 150000, elig: null,    appr: null, rej: null,                                                     invName: 'Margaret Chen-Williams', assetName: 'ELTIF Retail', age: 25 },
    { id: OB5_ID,  investor_id: amelieId,   asset_id: eltifRetail, status: 'eligible',  requested_units: 300000, elig: null,    appr: null, rej: null,                                                     invName: 'Amelie Dubois',     assetName: 'ELTIF Retail', age: 20 },
    { id: OB6_ID,  investor_id: muellerId,  asset_id: gammaClassA, status: 'eligible',  requested_units: 100000, elig: null,    appr: null, rej: null,                                                     invName: 'Mueller Family Office', assetName: 'Gamma A',  age: 16 },

    // ── Approved (2) — approved, awaiting allocation ──
    { id: OB7_ID,  investor_id: sofiaId,   asset_id: eltifRetail, status: 'approved',   requested_units: 200000, elig: null,    appr: DR25_ID, rej: null,                                                  invName: 'Dr. Sofia Papadopoulos', assetName: 'ELTIF Retail', age: 8 },
    { id: OB8_ID,  investor_id: hansId,    asset_id: gammaClassA, status: 'approved',   requested_units: 450000, elig: null,    appr: DR24_ID, rej: null,                                                  invName: 'Hans Weber',        assetName: 'Gamma A',      age: 4 },

    // ── Allocated (6) — completed onboarding ──
    { id: OB9_ID,  investor_id: calpersId, asset_id: deltaInst,   status: 'allocated',  requested_units: 262000, elig: DR1_ID,  appr: null, rej: null,                                                     invName: 'CalPERS',           assetName: 'QIAIF Inst',   age: 45 },
    { id: OB10_ID, investor_id: norgesId,  asset_id: raifClassA,  status: 'allocated',  requested_units: 1100000, elig: DR2_ID, appr: null, rej: null,                                                     invName: 'Norges Bank',       assetName: 'RAIF A',       age: 43 },
    { id: OB11_ID, investor_id: thomasId,  asset_id: eltifRetail, status: 'allocated',  requested_units: 400000, elig: DR5_ID,  appr: null, rej: null,                                                     invName: 'Thomas Keller',     assetName: 'ELTIF Retail', age: 40 },
    { id: OB12_ID, investor_id: rothschildId, asset_id: sifClassA, status: 'allocated', requested_units: 120000, elig: DR4_ID,  appr: null, rej: null,                                                     invName: 'Rothschild',        assetName: 'SIF A',        age: 38 },
    { id: OB13_ID, investor_id: allianzId, asset_id: gammaClassB, status: 'allocated',  requested_units: 600000, elig: DR7_ID,  appr: null, rej: null,                                                     invName: 'Allianz',           assetName: 'Gamma B',      age: 35 },
    { id: OB14_ID, investor_id: tikehauId, asset_id: eltifPro,    status: 'allocated',  requested_units: 200000, elig: null,    appr: null, rej: null,                                                     invName: 'Tikehau Capital',   assetName: 'ELTIF Pro',    age: 32 },

    // ── Rejected (2) — failed at approval stage ──
    { id: OB15_ID, investor_id: vanderbergId, asset_id: gammaClassA, status: 'rejected', requested_units: 100000, elig: null, appr: null, rej: JSON.stringify(['KYC documentation expired during approval review']), invName: 'Van der Berg',  assetName: 'Gamma A',    age: 14 },
    { id: OB16_ID, investor_id: liweiId,   asset_id: deltaInst,    status: 'rejected',  requested_units: 100000, elig: DR18_ID, appr: null, rej: JSON.stringify(['Failed suitability assessment for QIAIF']),        invName: 'Li Wei Zhang',  assetName: 'QIAIF Inst', age: 10 },

    // ── Ineligible (2) — failed eligibility ──
    { id: OB17_ID, investor_id: annaId,    asset_id: raifClassA,  status: 'ineligible', requested_units: 50000,  elig: DR16_ID, appr: null, rej: null,                                                     invName: 'Anna Kowalski',     assetName: 'RAIF A',       age: 16 },
    { id: OB18_ID, investor_id: miguelId,  asset_id: raifClassA,  status: 'ineligible', requested_units: 50000,  elig: DR14_ID, appr: null, rej: null,                                                     invName: 'Miguel Santos',     assetName: 'RAIF A',       age: 20 },
  ];

  for (const ob of onboardingRecords) {
    if (await exists('onboarding_records', ob.id)) {
      console.log(`  → Onboarding ${ob.invName} → ${ob.assetName} already exists`);
    } else {
      const ts = daysAgo(ob.age);
      await execute(
        `INSERT INTO onboarding_records
           (id, investor_id, asset_id, status, requested_units,
            eligibility_decision_id, approval_decision_id, rejection_reasons,
            applied_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9)`,
        [ob.id, ob.investor_id, ob.asset_id, ob.status, ob.requested_units, ob.elig, ob.appr, ob.rej, ts]
      );
      console.log(`  ✓ Onboarding: ${ob.invName} → ${ob.assetName} (${ob.status}, ${ob.requested_units.toLocaleString()} units)`);
    }
  }

  // =========================================================================
  // 9. Transfers (14 total — linked to decision records where applicable)
  // =========================================================================
  console.log('\n[Transfers]');

  const transfers = [
    // ── SIF (4) — active secondary market ──
    { id: TR1_ID,  asset_id: sifClassA,  from_id: calpersId,    to_id: rothschildId, units: 20000,  dr: DR4_ID,  fromName: 'CalPERS',    toName: 'Rothschild',    assetName: 'SIF A',      age: 48 },
    { id: TR2_ID,  asset_id: sifClassA,  from_id: klausId,      to_id: erikId,       units: 15000,  dr: null,    fromName: 'Klaus',      toName: 'Erik',          assetName: 'SIF A',      age: 35 },
    { id: TR3_ID,  asset_id: sifClassB,  from_id: norgesId,     to_id: lombardId,    units: 10000,  dr: null,    fromName: 'Norges',     toName: 'Lombard',       assetName: 'SIF B',      age: 22 },
    { id: TR4_ID,  asset_id: sifClassA,  from_id: thomasId,     to_id: amelieId,     units: 10000,  dr: DR13_ID, fromName: 'Thomas',     toName: 'Amelie',        assetName: 'SIF A',      age: 20 },

    // ── RAIF (3) ──
    { id: TR5_ID,  asset_id: raifClassA, from_id: norgesId,     to_id: allianzId,    units: 50000,  dr: DR10_ID, fromName: 'Norges',     toName: 'Allianz',       assetName: 'RAIF A',     age: 30 },
    { id: TR6_ID,  asset_id: raifFeeder, from_id: rothschildId, to_id: tikehauId,    units: 30000,  dr: DR6_ID,  fromName: 'Rothschild', toName: 'Tikehau',       assetName: 'RAIF F',     age: 42 },
    { id: TR7_ID,  asset_id: raifClassA, from_id: allianzId,    to_id: temasekId,    units: 40000,  dr: null,    fromName: 'Allianz',    toName: 'Temasek',       assetName: 'RAIF A',     age: 18 },

    // ── Gamma (3) ──
    { id: TR8_ID,  asset_id: gammaClassA, from_id: hansId,      to_id: muellerId,    units: 50000,  dr: DR8_ID,  fromName: 'Hans',       toName: 'Mueller',       assetName: 'Gamma A',    age: 37 },
    { id: TR9_ID,  asset_id: gammaClassB, from_id: allianzId,   to_id: dublinId,     units: 100000, dr: null,    fromName: 'Allianz',    toName: 'Dublin Capital', assetName: 'Gamma B',   age: 15 },
    { id: TR10_ID, asset_id: gammaClassB, from_id: lombardId,   to_id: temasekId,    units: 75000,  dr: null,    fromName: 'Lombard',    toName: 'Temasek',       assetName: 'Gamma B',    age: 8 },

    // ── QIAIF (2) ──
    { id: TR11_ID, asset_id: deltaInst,  from_id: calpersId,    to_id: temasekId,    units: 30000,  dr: DR3_ID,  fromName: 'CalPERS',    toName: 'Temasek',       assetName: 'QIAIF Inst', age: 50 },
    { id: TR12_ID, asset_id: deltaClassB, from_id: rothschildId, to_id: tikehauId,   units: 15000,  dr: null,    fromName: 'Rothschild', toName: 'Tikehau',       assetName: 'QIAIF B',    age: 12 },

    // ── ELTIF (2) ──
    { id: TR13_ID, asset_id: eltifRetail, from_id: thomasId,    to_id: marieId,      units: 50000,  dr: null,    fromName: 'Thomas',     toName: 'Marie',         assetName: 'ELTIF R',    age: 6 },
    { id: TR14_ID, asset_id: eltifPro,   from_id: tikehauId,    to_id: sarahId,      units: 25000,  dr: null,    fromName: 'Tikehau',    toName: 'Sarah',         assetName: 'ELTIF P',    age: 3 },
  ];

  for (const tr of transfers) {
    if (await exists('transfers', tr.id)) {
      console.log(`  → Transfer ${tr.fromName} → ${tr.toName} (${tr.assetName}) already exists`);
    } else {
      const ts = daysAgo(tr.age);
      await execute(
        `INSERT INTO transfers
           (id, asset_id, from_investor_id, to_investor_id, units, decision_record_id, executed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [tr.id, tr.asset_id, tr.from_id, tr.to_id, tr.units, tr.dr, ts]
      );
      console.log(`  ✓ Transfer: ${tr.fromName} → ${tr.toName}: ${tr.units.toLocaleString()} ${tr.assetName} units (${tr.age}d ago)`);
    }
  }

  // =========================================================================
  // 10. Events (55 total — audit trail spread over 90 days)
  // =========================================================================
  console.log('\n[Events]');

  const events: Array<{
    event_type: string;
    entity_type: string;
    entity_id: string;
    payload: Record<string, unknown>;
    label: string;
    age: number;
  }> = [
    // ── Fund structure created (5) ──
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: SIF_ID,     payload: { name: 'Meridian SIF Alpha', legal_form: 'SIF', domicile: 'LU' },                     label: 'SIF created',     age: 88 },
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: RAIF_ID,    payload: { name: 'Evergreen RAIF Beta', legal_form: 'RAIF', domicile: 'LU' },                    label: 'RAIF created',    age: 86 },
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: GAMMA_ID,   payload: { name: 'Rhine Spezial-AIF Gamma', legal_form: 'Spezial_AIF', domicile: 'DE' },         label: 'Gamma created',   age: 84 },
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: DELTA_ID,   payload: { name: 'Atlantic QIAIF Delta', legal_form: 'QIAIF', domicile: 'IE' },                  label: 'QIAIF created',   age: 82 },
    { event_type: 'fund_structure.created', entity_type: 'fund_structure', entity_id: EPSILON_ID, payload: { name: 'Horizon ELTIF 2.0 Epsilon', legal_form: 'ELTIF', domicile: 'LU' },             label: 'ELTIF created',   age: 80 },

    // ── Asset created (10) ──
    { event_type: 'asset.created', entity_type: 'asset', entity_id: sifClassA,   payload: { name: 'SIF Alpha Class A', total_units: 1000000, fund: SIF_ID },        label: 'SIF A created',     age: 85 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: sifClassB,   payload: { name: 'SIF Alpha Class B', total_units: 500000, fund: SIF_ID },         label: 'SIF B created',     age: 85 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: raifClassA,  payload: { name: 'RAIF Beta Class A', total_units: 2000000, fund: RAIF_ID },       label: 'RAIF A created',    age: 83 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: raifFeeder,  payload: { name: 'RAIF Beta Feeder', total_units: 500000, fund: RAIF_ID },         label: 'RAIF F created',    age: 83 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: gammaClassA, payload: { name: 'Spezial Gamma Class A', total_units: 1500000, fund: GAMMA_ID },  label: 'Gamma A created',   age: 81 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: gammaClassB, payload: { name: 'Spezial Gamma Class B', total_units: 3000000, fund: GAMMA_ID },  label: 'Gamma B created',   age: 81 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: deltaInst,   payload: { name: 'QIAIF Delta Inst', total_units: 750000, fund: DELTA_ID },        label: 'QIAIF Inst created', age: 79 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: deltaClassB, payload: { name: 'QIAIF Delta Class B', total_units: 250000, fund: DELTA_ID },     label: 'QIAIF B created',   age: 79 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: eltifRetail, payload: { name: 'ELTIF Epsilon Retail', total_units: 5000000, fund: EPSILON_ID },  label: 'ELTIF R created',   age: 77 },
    { event_type: 'asset.created', entity_type: 'asset', entity_id: eltifPro,    payload: { name: 'ELTIF Epsilon Pro', total_units: 1000000, fund: EPSILON_ID },     label: 'ELTIF P created',   age: 77 },

    // ── Investor created (8 notable) ──
    { event_type: 'investor.created', entity_type: 'investor', entity_id: calpersId,    payload: { name: 'CalPERS', jurisdiction: 'US', investor_type: 'institutional' },                        label: 'CalPERS created',     age: 75 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: norgesId,     payload: { name: 'Norges Bank Investment Management', jurisdiction: 'NO', investor_type: 'institutional' }, label: 'Norges created',     age: 73 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: rothschildId, payload: { name: 'Rothschild & Co', jurisdiction: 'CH', investor_type: 'professional' },                 label: 'Rothschild created', age: 70 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: klausId,      payload: { name: 'Klaus Schmidt', jurisdiction: 'DE', investor_type: 'semi_professional' },              label: 'Klaus created',      age: 68 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: hansId,       payload: { name: 'Hans Weber', jurisdiction: 'DE', investor_type: 'semi_professional' },                 label: 'Hans created',       age: 65 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: thomasId,     payload: { name: 'Thomas Keller', jurisdiction: 'DE', investor_type: 'retail' },                         label: 'Thomas created',     age: 62 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: annaId,       payload: { name: 'Anna Kowalski', jurisdiction: 'PL', investor_type: 'retail' },                         label: 'Anna created',       age: 55 },
    { event_type: 'investor.created', entity_type: 'investor', entity_id: henrikId,     payload: { name: 'Henrik Lindqvist', jurisdiction: 'SE', investor_type: 'well_informed' },               label: 'Henrik created',     age: 45 },

    // ── Holding created (10 key holdings) ──
    { event_type: 'holding.created', entity_type: 'holding', entity_id: calpersId,    payload: { investor: 'CalPERS', asset: 'SIF A', units: 140000 },                                           label: 'CalPERS SIF A holding',   age: 60 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: norgesId,     payload: { investor: 'Norges Bank', asset: 'RAIF A', units: 1100000, concentration_pct: 55.0 },             label: 'Norges RAIF A holding',   age: 58 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: hansId,       payload: { investor: 'Hans Weber', asset: 'Gamma A', units: 450000, concentration_pct: 30.0 },              label: 'Hans Gamma A holding',    age: 56 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: calpersId,    payload: { investor: 'CalPERS', asset: 'QIAIF Inst', units: 262000, concentration_pct: 34.9 },              label: 'CalPERS QIAIF holding',   age: 54 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: thomasId,     payload: { investor: 'Thomas Keller', asset: 'ELTIF R', units: 400000 },                                   label: 'Thomas ELTIF holding',    age: 50 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: allianzId,    payload: { investor: 'Allianz', asset: 'Gamma B', units: 600000 },                                         label: 'Allianz Gamma B holding', age: 48 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: lombardId,    payload: { investor: 'Lombard Odier', asset: 'SIF B', units: 70000 },                                      label: 'Lombard SIF B holding',   age: 46 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: dublinId,     payload: { investor: 'Dublin Capital', asset: 'QIAIF Inst', units: 100000 },                               label: 'Dublin QIAIF holding',    age: 44 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: amelieId,     payload: { investor: 'Amelie Dubois', asset: 'ELTIF R', units: 350000 },                                   label: 'Amelie ELTIF holding',    age: 40 },
    { event_type: 'holding.created', entity_type: 'holding', entity_id: margaretId,   payload: { investor: 'Margaret Chen-Williams', asset: 'ELTIF R', units: 200000 },                          label: 'Margaret ELTIF holding',  age: 38 },

    // ── Decision recorded (10 selected) ──
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR1_ID,  payload: { type: 'eligibility_check', result: 'approved', subject: 'CalPERS', asset: 'QIAIF Inst' },                       label: 'DR1 approved',         age: 58 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR2_ID,  payload: { type: 'eligibility_check', result: 'approved', subject: 'Norges Bank', asset: 'RAIF A' },                        label: 'DR2 approved',         age: 55 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR7_ID,  payload: { type: 'eligibility_check', result: 'approved', subject: 'Allianz', asset: 'Gamma B' },                           label: 'DR7 approved',         age: 42 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR14_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Miguel Santos', asset: 'RAIF A', violations: 2 },       label: 'DR14 rejected',        age: 21 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR16_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Anna Kowalski', asset: 'RAIF A', violations: 2 },       label: 'DR16 rejected',        age: 17 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR17_ID, payload: { type: 'transfer_validation', result: 'rejected', subject: 'Van der Berg→Miguel', asset: 'RAIF A', violations: 3 }, label: 'DR17 transfer rejected', age: 15 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR18_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Li Wei Zhang', asset: 'QIAIF Inst', violations: 2 },    label: 'DR18 rejected',        age: 13 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR20_ID, payload: { type: 'eligibility_check', result: 'rejected', subject: 'Miguel Santos', asset: 'SIF B', violations: 1 },        label: 'DR20 rejected',        age: 9 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR22_ID, payload: { type: 'scenario_analysis', result: 'simulated', subject: 'Norges Bank', asset: 'RAIF A', recommendation: 'Cap additional subscription' }, label: 'DR22 scenario', age: 5 },
    { event_type: 'decision.recorded', entity_type: 'decision_record', entity_id: DR23_ID, payload: { type: 'scenario_analysis', result: 'simulated', subject: 'CalPERS', asset: 'QIAIF Inst', recommendation: 'Limit subscription' }, label: 'DR23 scenario', age: 3 },

    // ── Transfer executed (8 selected) ──
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR1_ID,  payload: { from: 'CalPERS', to: 'Rothschild', asset: 'SIF A', units: 20000 },           label: 'Transfer CalPERS→Rothschild', age: 48 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR5_ID,  payload: { from: 'Norges', to: 'Allianz', asset: 'RAIF A', units: 50000 },              label: 'Transfer Norges→Allianz',     age: 30 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR6_ID,  payload: { from: 'Rothschild', to: 'Tikehau', asset: 'RAIF F', units: 30000 },          label: 'Transfer Rothschild→Tikehau', age: 42 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR8_ID,  payload: { from: 'Hans', to: 'Mueller', asset: 'Gamma A', units: 50000 },               label: 'Transfer Hans→Mueller',       age: 37 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR9_ID,  payload: { from: 'Allianz', to: 'Dublin Capital', asset: 'Gamma B', units: 100000 },    label: 'Transfer Allianz→Dublin',     age: 15 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR11_ID, payload: { from: 'CalPERS', to: 'Temasek', asset: 'QIAIF Inst', units: 30000 },         label: 'Transfer CalPERS→Temasek',    age: 50 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR13_ID, payload: { from: 'Thomas', to: 'Marie', asset: 'ELTIF R', units: 50000 },               label: 'Transfer Thomas→Marie',       age: 6 },
    { event_type: 'transfer.executed', entity_type: 'transfer', entity_id: TR14_ID, payload: { from: 'Tikehau', to: 'Sarah', asset: 'ELTIF P', units: 25000 },              label: 'Transfer Tikehau→Sarah',      age: 3 },

    // ── Onboarding events (4 selected) ──
    { event_type: 'onboarding.status_changed', entity_type: 'onboarding_record', entity_id: OB9_ID,  payload: { investor: 'CalPERS', asset: 'QIAIF Inst', status: 'allocated', previous_status: 'approved' },           label: 'CalPERS onboarding allocated',   age: 45 },
    { event_type: 'onboarding.status_changed', entity_type: 'onboarding_record', entity_id: OB10_ID, payload: { investor: 'Norges Bank', asset: 'RAIF A', status: 'allocated', previous_status: 'approved' },            label: 'Norges onboarding allocated',    age: 43 },
    { event_type: 'onboarding.rejected',       entity_type: 'onboarding_record', entity_id: OB17_ID, payload: { investor: 'Anna Kowalski', asset: 'RAIF A', status: 'ineligible', reasons: ['Retail not eligible'] },    label: 'Anna onboarding ineligible',     age: 16 },
    { event_type: 'onboarding.status_changed', entity_type: 'onboarding_record', entity_id: OB7_ID,  payload: { investor: 'Dr. Sofia Papadopoulos', asset: 'ELTIF R', status: 'approved', previous_status: 'eligible' }, label: 'Sofia onboarding approved',       age: 8 },
  ];

  for (const evt of events) {
    const existing = await query(
      `SELECT 1 FROM events WHERE event_type = $1 AND entity_type = $2 AND entity_id = $3 LIMIT 1`,
      [evt.event_type, evt.entity_type, evt.entity_id]
    );
    if (existing.length > 0) {
      console.log(`  → Event "${evt.label}" already exists`);
    } else {
      const ts = daysAgo(evt.age);
      await execute(
        `INSERT INTO events (id, event_type, entity_type, entity_id, payload, timestamp)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [evt.event_type, evt.entity_type, evt.entity_id, JSON.stringify(evt.payload), ts]
      );
      console.log(`  ✓ Event: ${evt.label} (${evt.age}d ago)`);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n========================================');
  console.log('  Demo seed complete!');
  console.log('========================================');
  console.log('  5 fund structures (SIF + RAIF + Gamma + QIAIF + ELTIF)');
  console.log('  16 eligibility criteria');
  console.log('  10 assets (2 per fund)');
  console.log('  10 rules (permissive)');
  console.log('  25 investors (5 institutional, 6 professional, 5 semi-pro, 3 well-informed, 6 retail)');
  console.log('  46 holdings (strategic concentration patterns)');
  console.log('  25 decision records (13 approved, 8 rejected, 2 scenario, 2 onboarding)');
  console.log('  18 onboarding records (3 applied, 3 eligible, 2 approved, 6 allocated, 2 rejected, 2 ineligible)');
  console.log('  14 transfers (4 SIF, 3 RAIF, 3 Gamma, 2 QIAIF, 2 ELTIF)');
  console.log('  55 events (audit trail, spread over 90 days)');
  console.log('========================================');
  console.log('\nRisk flags for demo:');
  console.log('  Concentration:');
  console.log('    - Norges Bank: 55% of RAIF Class A (HIGH)');
  console.log('    - CalPERS: 34.9% of QIAIF Delta Inst (MEDIUM)');
  console.log('    - Hans Weber: 30% of Gamma Class A (MEDIUM)');
  console.log('    - SIF & ELTIF: well-diversified (LOW)');
  console.log('  KYC expiring <90d:');
  console.log('    - Baillie Gifford: expires 2026-04-16 (~60d)');
  console.log('    - Margaret Chen-Williams: expires 2026-04-01 (~45d)');
  console.log('    - Mueller Family Office: expires 2026-05-01 (~75d)');
  console.log('  KYC expired:');
  console.log('    - Van der Berg Holding: expired 2025-10-15');
  console.log('    - Li Wei Zhang: expired 2025-08-30');
  console.log('    - Miguel Santos: expired 2025-11-30');
  console.log('  KYC pending:');
  console.log('    - Henrik Lindqvist (well-informed)');
  console.log('    - Anna Kowalski (retail)');
  console.log('  Violations (bar chart):');
  console.log('    - RAIF: 4 rejections, 8 violations (leads)');
  console.log('    - QIAIF: 2 rejections, 3 violations');
  console.log('    - SIF: 1 rejection, 1 violation');
  console.log('    - ELTIF: 1 rejection, 1 violation');
  console.log('========================================');
  console.log('\nDemo accounts:');
  console.log('  admin@caelith.com      / Admin1234    (admin)');
  console.log('  compliance@caelith.com  / Compliance1! (compliance_officer)');
  console.log('  ops@caelith.com         / Ops12345!    (admin)');
  console.log('  demo@caelith.com        / Demo1234!    (viewer)');
  console.log('  investor@caelith.com    / Investor1!   (viewer)');
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
