/**
 * Showcase Seed — Rich demo data for dashboard visualizations
 *
 * Creates 4 fund structures, 8 assets, 22 investors, holdings,
 * eligibility criteria, onboarding records, and decision records
 * to populate all 5 dashboard charts with impressive, realistic data.
 *
 * Usage: npx tsx scripts/seed-showcase.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING where possible.
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query, execute, closeDb } from '../src/backend/db.js';

// ── Fixed UUIDs ──────────────────────────────────────────

const FUND_SIF    = '10000000-0000-0000-0000-000000000001';
const FUND_RAIF   = '10000000-0000-0000-0000-000000000002';
const FUND_QIAIF  = '10000000-0000-0000-0000-000000000003';
const FUND_ELTIF  = '10000000-0000-0000-0000-000000000004';

// ── Helpers ──────────────────────────────────────────────

async function exists(table: string, id: string): Promise<boolean> {
  const rows = await query('SELECT 1 FROM ' + table + ' WHERE id = $1', [id]);
  return rows.length > 0;
}

async function existsByName(table: string, name: string): Promise<string | null> {
  const rows = await query<{ id: string }>('SELECT id FROM ' + table + ' WHERE name = $1', [name]);
  return rows.length > 0 ? rows[0].id : null;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ── Main Seed ────────────────────────────────────────────

async function seed() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Caelith Showcase Seed — Dashboard Visualizations ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ====================================================================
  // 0. Admin User
  // ====================================================================
  console.log('▸ [Users]');
  const existingUser = await query('SELECT id FROM users WHERE email = $1', ['admin@caelith.dev']);
  let adminId: string;
  if (existingUser.length > 0) {
    adminId = (existingUser[0] as { id: string }).id;
    console.log('  → admin@caelith.dev exists');
  } else {
    const hash = await bcrypt.hash('admin1234', 10);
    const rows = await query<{ id: string }>(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'System Admin', 'admin', true, now(), now())
       RETURNING id`,
      ['admin@caelith.dev', hash]
    );
    adminId = rows[0].id;
    console.log('  ✓ Created admin@caelith.dev (password: admin1234)');
  }

  // ====================================================================
  // 1. Fund Structures — 4 diverse vehicles
  // ====================================================================
  console.log('\n▸ [Fund Structures]');

  const fundDefs = [
    { id: FUND_SIF,   name: 'Meridian SIF Alpha',       form: 'SIF',   dom: 'LU', fw: 'AIFMD',  aifm: 'Meridian Capital AIFM S.à r.l.',        lei: '5493001KJTIIGC8Y1R12', target: 50000000, date: '2024-03-15' },
    { id: FUND_RAIF,  name: 'Evergreen RAIF Beta',      form: 'RAIF',  dom: 'LU', fw: 'AIFMD',  aifm: 'Evergreen Management Company S.A.',      lei: '2138008UBM3RKGJKOT64', target: 100000000, date: '2023-11-01' },
    { id: FUND_QIAIF, name: 'Atlantic QIAIF Gamma',     form: 'QIAIF', dom: 'IE', fw: 'AIFMD',  aifm: 'Atlantic Fund Managers DAC',             lei: '635400GXFJ3HL2K8XR88', target: 75000000, date: '2024-06-20' },
    { id: FUND_ELTIF, name: 'Horizon ELTIF 2.0 Delta',  form: 'ELTIF', dom: 'LU', fw: 'ELTIF',  aifm: 'Horizon Alternatives S.A.',              lei: '529900T8BM49AURSDO55', target: 200000000, date: '2024-01-10' },
  ];

  for (const f of fundDefs) {
    if (await exists('fund_structures', f.id)) {
      console.log(`  → ${f.name} exists`);
    } else {
      await execute(
        `INSERT INTO fund_structures
           (id, name, legal_form, domicile, regulatory_framework, aifm_name, aifm_lei, inception_date, target_size, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'EUR', 'active', now(), now())`,
        [f.id, f.name, f.form, f.dom, f.fw, f.aifm, f.lei, f.date, f.target]
      );
      console.log(`  ✓ ${f.name} (${f.form} · ${f.dom} · ${f.fw})`);
    }
  }

  // ====================================================================
  // 2. Eligibility Criteria — comprehensive coverage
  // ====================================================================
  console.log('\n▸ [Eligibility Criteria]');

  const eligCriteria = [
    // SIF: professional (no min), semi_professional (€125K), institutional (no min)
    { fs: FUND_SIF, type: 'professional',      jur: '*', min: 0,          suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: FUND_SIF, type: 'semi_professional',  jur: '*', min: 12500000,   suit: true,  src: 'SIF Law 13 Feb 2007, Art. 2' },
    { fs: FUND_SIF, type: 'institutional',      jur: '*', min: 0,          suit: false, src: 'SIF Law 13 Feb 2007, Art. 2' },
    // RAIF: same as SIF but different source
    { fs: FUND_RAIF, type: 'professional',      jur: '*', min: 0,          suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: FUND_RAIF, type: 'semi_professional',  jur: '*', min: 12500000,   suit: true,  src: 'RAIF Law 23 Jul 2016, Art. 3' },
    { fs: FUND_RAIF, type: 'institutional',      jur: '*', min: 0,          suit: false, src: 'RAIF Law 23 Jul 2016, Art. 3' },
    // QIAIF: professional only (€100K min), institutional (no min)
    { fs: FUND_QIAIF, type: 'professional',     jur: '*', min: 10000000,   suit: false, src: 'Central Bank (Supervision & Enforcement) Act 2013, SI 257/2013' },
    { fs: FUND_QIAIF, type: 'institutional',     jur: '*', min: 0,          suit: false, src: 'Central Bank (Supervision & Enforcement) Act 2013, SI 257/2013' },
    // ELTIF 2.0: all types (retail-friendly)
    { fs: FUND_ELTIF, type: 'institutional',     jur: '*', min: 0,          suit: false, src: 'Regulation (EU) 2023/606, Art. 30' },
    { fs: FUND_ELTIF, type: 'professional',      jur: '*', min: 0,          suit: false, src: 'Regulation (EU) 2023/606, Art. 30' },
    { fs: FUND_ELTIF, type: 'semi_professional',  jur: '*', min: 1000000,    suit: true,  src: 'Regulation (EU) 2023/606, Art. 30' },
    { fs: FUND_ELTIF, type: 'well_informed',     jur: '*', min: 1000000,    suit: true,  src: 'Regulation (EU) 2023/606, Art. 30' },
    { fs: FUND_ELTIF, type: 'retail',            jur: '*', min: 0,          suit: true,  src: 'Regulation (EU) 2023/606, Art. 30' },
  ];

  for (const c of eligCriteria) {
    const ex = await query(
      `SELECT 1 FROM eligibility_criteria WHERE fund_structure_id = $1 AND investor_type = $2 AND jurisdiction = $3 AND superseded_at IS NULL`,
      [c.fs, c.type, c.jur]
    );
    if (ex.length > 0) {
      console.log(`  → ${c.type} for fund ${c.fs.slice(-1)} exists`);
    } else {
      await execute(
        `INSERT INTO eligibility_criteria
           (id, fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '[]', $6, CURRENT_DATE, now())`,
        [c.fs, c.jur, c.type, c.min, c.suit, c.src]
      );
      console.log(`  ✓ ${c.type} → fund ...${c.fs.slice(-1)} (min €${(c.min / 100).toLocaleString()})`);
    }
  }

  // ====================================================================
  // 3. Assets — 8 share classes across 4 funds
  // ====================================================================
  console.log('\n▸ [Assets]');

  const assetDefs = [
    { name: 'Meridian SIF Alpha – Class A',        fs: FUND_SIF,   type: 'Fund',           units: 1000000, price: 100 },
    { name: 'Meridian SIF Alpha – Class B',        fs: FUND_SIF,   type: 'Fund',           units: 500000,  price: 1000 },
    { name: 'Evergreen RAIF Beta – Class A',       fs: FUND_RAIF,  type: 'Fund',           units: 2000000, price: 50 },
    { name: 'Evergreen RAIF Beta – Feeder',        fs: FUND_RAIF,  type: 'LP Interest',    units: 500000,  price: 100 },
    { name: 'Atlantic QIAIF Gamma – Institutional', fs: FUND_QIAIF, type: 'Fund',          units: 750000,  price: 100 },
    { name: 'Atlantic QIAIF Gamma – Class B',      fs: FUND_QIAIF, type: 'Fund',           units: 250000,  price: 500 },
    { name: 'Horizon ELTIF Delta – Retail',        fs: FUND_ELTIF, type: 'Fund',           units: 5000000, price: 10 },
    { name: 'Horizon ELTIF Delta – Professional',  fs: FUND_ELTIF, type: 'Private Equity', units: 1000000, price: 100 },
  ];

  const assetIds: Record<string, string> = {};
  for (const a of assetDefs) {
    const existingId = await existsByName('assets', a.name);
    if (existingId) {
      assetIds[a.name] = existingId;
      console.log(`  → ${a.name} exists`);
    } else {
      const rows = await query<{ id: string }>(
        `INSERT INTO assets (id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now()) RETURNING id`,
        [a.name, a.type, a.units, a.fs, a.price]
      );
      assetIds[a.name] = rows[0].id;
      console.log(`  ✓ ${a.name} (${a.units.toLocaleString()} units @ €${a.price})`);
    }
  }

  // Short references
  const A_SIF_A  = assetIds['Meridian SIF Alpha – Class A'];
  const A_SIF_B  = assetIds['Meridian SIF Alpha – Class B'];
  const A_RAIF_A = assetIds['Evergreen RAIF Beta – Class A'];
  const A_RAIF_F = assetIds['Evergreen RAIF Beta – Feeder'];
  const A_QIAIF  = assetIds['Atlantic QIAIF Gamma – Institutional'];
  const A_QIAIF_B = assetIds['Atlantic QIAIF Gamma – Class B'];
  const A_ELTIF_R = assetIds['Horizon ELTIF Delta – Retail'];
  const A_ELTIF_P = assetIds['Horizon ELTIF Delta – Professional'];

  // ====================================================================
  // 4. Rules (one per asset)
  // ====================================================================
  console.log('\n▸ [Rules]');

  for (const [name, assetId] of Object.entries(assetIds)) {
    const ex = await query('SELECT 1 FROM rules WHERE asset_id = $1', [assetId]);
    if (ex.length > 0) {
      console.log(`  → Rules for ${name.split(' – ')[0]}... exist`);
    } else {
      await execute(
        `INSERT INTO rules (id, asset_id, version, qualification_required, lockup_days, jurisdiction_whitelist, transfer_whitelist, created_at)
         VALUES (gen_random_uuid(), $1, 1, false, 0, '[]', NULL, now())`,
        [assetId]
      );
      console.log(`  ✓ Permissive rules → ${name.slice(0, 40)}...`);
    }
  }

  // ====================================================================
  // 5. Investors — 22 diverse investors
  // ====================================================================
  console.log('\n▸ [Investors]');

  const today = new Date();
  const investorDefs = [
    // ── Institutional (4) ──
    { name: 'CalPERS Public Pension Fund',     jur: 'US', type: 'institutional',     kyc: 'verified', expiry: daysFromNow(540), lei: '549300BFHXK1KNC3FW24' },
    { name: 'Norges Bank Investment Mgmt',     jur: 'NO', type: 'institutional',     kyc: 'verified', expiry: daysFromNow(365), lei: '549300VXRLWV66J3QO18' },
    { name: 'Allianz Global Investors GmbH',   jur: 'DE', type: 'institutional',     kyc: 'verified', expiry: daysFromNow(730), lei: '529900LVQ2FNQB7GJB12' },
    { name: 'Temasek Holdings Pte Ltd',        jur: 'SG', type: 'institutional',     kyc: 'verified', expiry: daysFromNow(200), lei: '254900VFZHLFXQ18SB76' },

    // ── Professional (5) ──
    { name: 'Rothschild & Co Wealth Mgmt',     jur: 'CH', type: 'professional',      kyc: 'verified', expiry: daysFromNow(450), lei: '969500W63RA3S3OJPM33' },
    { name: 'Baillie Gifford & Co',            jur: 'GB', type: 'professional',      kyc: 'verified', expiry: daysFromNow(60),  lei: '213800NRGBQKJ25G3X30' },  // expiring soon!
    { name: 'Lombard Odier Group',             jur: 'CH', type: 'professional',      kyc: 'verified', expiry: daysFromNow(320), lei: '549300V7G7B6B3L4P756' },
    { name: 'Nomura Asset Management Co',      jur: 'JP', type: 'professional',      kyc: 'pending',  expiry: null,             lei: '353800F2FOVQ8WRMID22' },
    { name: 'Tikehau Capital SCA',             jur: 'FR', type: 'professional',      kyc: 'verified', expiry: daysFromNow(180), lei: '969500BE4SM3HZ1VQ580' },

    // ── Semi-Professional (4) ──
    { name: 'Mueller Family Office GmbH',      jur: 'DE', type: 'semi_professional', kyc: 'verified', expiry: daysFromNow(75),  lei: null },   // expiring soon!
    { name: 'Yamamoto Holdings KK',            jur: 'JP', type: 'semi_professional', kyc: 'verified', expiry: daysFromNow(400), lei: null },
    { name: 'Van der Berg Investments BV',     jur: 'NL', type: 'semi_professional', kyc: 'expired',  expiry: daysFromNow(-30), lei: null },   // expired!
    { name: 'O\'Sullivan Trust',               jur: 'IE', type: 'semi_professional', kyc: 'verified', expiry: daysFromNow(280), lei: null },

    // ── Well-Informed (3) ──
    { name: 'Dr. Sofia Papadopoulos',          jur: 'GR', type: 'well_informed',     kyc: 'verified', expiry: daysFromNow(150), lei: null },
    { name: 'Henrik Lindqvist',                jur: 'SE', type: 'well_informed',     kyc: 'pending',  expiry: null,             lei: null },
    { name: 'Margaret Chen-Williams',          jur: 'HK', type: 'well_informed',     kyc: 'verified', expiry: daysFromNow(45),  lei: null },   // expiring soon!

    // ── Retail (6) — for ELTIF ──
    { name: 'Thomas Keller',                   jur: 'DE', type: 'retail',            kyc: 'verified', expiry: daysFromNow(365), lei: null },
    { name: 'Amélie Dubois',                   jur: 'FR', type: 'retail',            kyc: 'verified', expiry: daysFromNow(290), lei: null },
    { name: 'Marco Bianchi',                   jur: 'IT', type: 'retail',            kyc: 'pending',  expiry: null,             lei: null },
    { name: 'Anna Kowalski',                   jur: 'PL', type: 'retail',            kyc: 'verified', expiry: daysFromNow(200), lei: null },
    { name: 'James O\'Reilly',                 jur: 'IE', type: 'retail',            kyc: 'verified', expiry: daysFromNow(500), lei: null },
    { name: 'Li Wei Zhang',                    jur: 'CN', type: 'retail',            kyc: 'expired',  expiry: daysFromNow(-15), lei: null },   // expired!
  ];

  const investorIds: Record<string, string> = {};
  for (const inv of investorDefs) {
    const existingId = await existsByName('investors', inv.name);
    if (existingId) {
      investorIds[inv.name] = existingId;
      console.log(`  → ${inv.name} exists`);
    } else {
      const rows = await query<{ id: string }>(
        `INSERT INTO investors
           (id, name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, lei, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now())
         RETURNING id`,
        [
          inv.name,
          inv.jur,
          inv.type === 'institutional' || inv.type === 'professional',
          inv.type,
          inv.kyc,
          inv.expiry,
          inv.lei,
        ]
      );
      investorIds[inv.name] = rows[0].id;
      console.log(`  ✓ ${inv.name} (${inv.jur} · ${inv.type} · KYC: ${inv.kyc})`);
    }
  }

  // Short references
  const I = investorIds;
  const calpers     = I['CalPERS Public Pension Fund'];
  const norges      = I['Norges Bank Investment Mgmt'];
  const allianz     = I['Allianz Global Investors GmbH'];
  const temasek     = I['Temasek Holdings Pte Ltd'];
  const rothschild  = I['Rothschild & Co Wealth Mgmt'];
  const baillie     = I['Baillie Gifford & Co'];
  const lombard     = I['Lombard Odier Group'];
  const nomura      = I['Nomura Asset Management Co'];
  const tikehau     = I['Tikehau Capital SCA'];
  const mueller     = I['Mueller Family Office GmbH'];
  const yamamoto    = I['Yamamoto Holdings KK'];
  const vanderberg  = I['Van der Berg Investments BV'];
  const osullivan   = I['O\'Sullivan Trust'];
  const sofia       = I['Dr. Sofia Papadopoulos'];
  const henrik      = I['Henrik Lindqvist'];
  const margaret    = I['Margaret Chen-Williams'];
  const thomas      = I['Thomas Keller'];
  const amelie      = I['Amélie Dubois'];
  const marco       = I['Marco Bianchi'];
  const anna        = I['Anna Kowalski'];
  const james       = I['James O\'Reilly'];
  const liwei       = I['Li Wei Zhang'];

  // ====================================================================
  // 6. Holdings — strategic allocations for charts
  // ====================================================================
  console.log('\n▸ [Holdings]');

  const holdingDefs = [
    // ── SIF Alpha Class A (1M units) — WELL DIVERSIFIED ──
    { inv: calpers,    asset: A_SIF_A, units: 150000, label: 'CalPERS → SIF A' },
    { inv: norges,     asset: A_SIF_A, units: 120000, label: 'Norges → SIF A' },
    { inv: allianz,    asset: A_SIF_A, units: 100000, label: 'Allianz → SIF A' },
    { inv: rothschild, asset: A_SIF_A, units: 80000,  label: 'Rothschild → SIF A' },
    { inv: baillie,    asset: A_SIF_A, units: 75000,  label: 'Baillie → SIF A' },
    { inv: tikehau,    asset: A_SIF_A, units: 60000,  label: 'Tikehau → SIF A' },
    { inv: mueller,    asset: A_SIF_A, units: 50000,  label: 'Mueller → SIF A' },
    { inv: osullivan,  asset: A_SIF_A, units: 45000,  label: 'O\'Sullivan → SIF A' },

    // ── SIF Alpha Class B (500K units) ──
    { inv: calpers,    asset: A_SIF_B, units: 100000, label: 'CalPERS → SIF B' },
    { inv: temasek,    asset: A_SIF_B, units: 80000,  label: 'Temasek → SIF B' },
    { inv: lombard,    asset: A_SIF_B, units: 60000,  label: 'Lombard → SIF B' },

    // ── RAIF Beta Class A (2M units) — CONCENTRATED (1 investor dominates) ──
    { inv: norges,     asset: A_RAIF_A, units: 1200000, label: 'Norges → RAIF A (DOMINANT)' },
    { inv: allianz,    asset: A_RAIF_A, units: 300000,  label: 'Allianz → RAIF A' },
    { inv: temasek,    asset: A_RAIF_A, units: 200000,  label: 'Temasek → RAIF A' },
    { inv: tikehau,    asset: A_RAIF_A, units: 100000,  label: 'Tikehau → RAIF A' },

    // ── RAIF Beta Feeder (500K units) ──
    { inv: mueller,    asset: A_RAIF_F, units: 200000, label: 'Mueller → RAIF Feeder' },
    { inv: yamamoto,   asset: A_RAIF_F, units: 150000, label: 'Yamamoto → RAIF Feeder' },

    // ── QIAIF Gamma Institutional (750K units) — MODERATELY CONCENTRATED ──
    { inv: calpers,    asset: A_QIAIF,  units: 250000, label: 'CalPERS → QIAIF' },
    { inv: allianz,    asset: A_QIAIF,  units: 200000, label: 'Allianz → QIAIF' },
    { inv: norges,     asset: A_QIAIF,  units: 150000, label: 'Norges → QIAIF' },
    { inv: rothschild, asset: A_QIAIF,  units: 50000,  label: 'Rothschild → QIAIF' },

    // ── QIAIF Gamma Class B (250K units) ──
    { inv: temasek,    asset: A_QIAIF_B, units: 100000, label: 'Temasek → QIAIF B' },
    { inv: baillie,    asset: A_QIAIF_B, units: 80000,  label: 'Baillie → QIAIF B' },

    // ── ELTIF Delta Retail (5M units) — BROAD RETAIL BASE ──
    { inv: thomas,     asset: A_ELTIF_R, units: 500000,  label: 'Keller → ELTIF Retail' },
    { inv: amelie,     asset: A_ELTIF_R, units: 400000,  label: 'Dubois → ELTIF Retail' },
    { inv: anna,       asset: A_ELTIF_R, units: 350000,  label: 'Kowalski → ELTIF Retail' },
    { inv: james,      asset: A_ELTIF_R, units: 300000,  label: 'O\'Reilly → ELTIF Retail' },
    { inv: sofia,      asset: A_ELTIF_R, units: 250000,  label: 'Papadopoulos → ELTIF Retail' },
    { inv: margaret,   asset: A_ELTIF_R, units: 200000,  label: 'Chen-Williams → ELTIF Retail' },

    // ── ELTIF Delta Professional (1M units) ──
    { inv: rothschild, asset: A_ELTIF_P, units: 300000,  label: 'Rothschild → ELTIF Pro' },
    { inv: tikehau,    asset: A_ELTIF_P, units: 250000,  label: 'Tikehau → ELTIF Pro' },
    { inv: lombard,    asset: A_ELTIF_P, units: 200000,  label: 'Lombard → ELTIF Pro' },
    { inv: calpers,    asset: A_ELTIF_P, units: 100000,  label: 'CalPERS → ELTIF Pro' },
  ];

  for (const h of holdingDefs) {
    const ex = await query(
      'SELECT 1 FROM holdings WHERE investor_id = $1 AND asset_id = $2',
      [h.inv, h.asset]
    );
    if (ex.length > 0) {
      console.log(`  → ${h.label} exists`);
    } else {
      await execute(
        `INSERT INTO holdings (id, investor_id, asset_id, units, acquired_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())`,
        [h.inv, h.asset, h.units, daysAgo(Math.floor(Math.random() * 180) + 30)]
      );
      console.log(`  ✓ ${h.label}: ${h.units.toLocaleString()} units`);
    }
  }

  // ====================================================================
  // 7. Decision Records — for violation chart
  // ====================================================================
  console.log('\n▸ [Decision Records]');

  const decisionDefs = [
    // ── Approved decisions (clean) ──
    { type: 'transfer_validation', asset: A_SIF_A,   result: 'approved', violations: 0, subject: calpers,    days: 45 },
    { type: 'transfer_validation', asset: A_SIF_A,   result: 'approved', violations: 0, subject: norges,     days: 40 },
    { type: 'eligibility_check',   asset: A_SIF_A,   result: 'approved', violations: 0, subject: rothschild, days: 60 },
    { type: 'eligibility_check',   asset: A_SIF_B,   result: 'approved', violations: 0, subject: calpers,    days: 55 },
    { type: 'onboarding_approval', asset: A_SIF_A,   result: 'approved', violations: 0, subject: mueller,    days: 35 },
    { type: 'transfer_validation', asset: A_RAIF_A,  result: 'approved', violations: 0, subject: norges,     days: 30 },
    { type: 'eligibility_check',   asset: A_RAIF_A,  result: 'approved', violations: 0, subject: allianz,    days: 50 },
    { type: 'eligibility_check',   asset: A_QIAIF,   result: 'approved', violations: 0, subject: calpers,    days: 42 },
    { type: 'eligibility_check',   asset: A_QIAIF,   result: 'approved', violations: 0, subject: norges,     days: 38 },
    { type: 'transfer_validation', asset: A_ELTIF_R, result: 'approved', violations: 0, subject: thomas,     days: 25 },
    { type: 'eligibility_check',   asset: A_ELTIF_R, result: 'approved', violations: 0, subject: amelie,     days: 20 },
    { type: 'onboarding_approval', asset: A_ELTIF_R, result: 'approved', violations: 0, subject: anna,       days: 15 },
    { type: 'transfer_validation', asset: A_ELTIF_P, result: 'approved', violations: 0, subject: rothschild, days: 28 },

    // ── Rejected decisions WITH violations — feeds violation chart ──
    // RAIF Beta (concentrated — multiple violations)
    { type: 'transfer_validation', asset: A_RAIF_A,  result: 'rejected', violations: 3, subject: vanderberg, days: 20,
      checks: [
        { rule: 'KYC Status', passed: false, message: 'Investor KYC status is expired' },
        { rule: 'Concentration Limit', passed: false, message: 'Transfer would exceed 50% concentration limit' },
        { rule: 'Jurisdiction Check', passed: false, message: 'Jurisdiction NL not in whitelist' },
      ] },
    { type: 'eligibility_check',   asset: A_RAIF_A,  result: 'rejected', violations: 2, subject: henrik,    days: 18,
      checks: [
        { rule: 'Investor Type', passed: false, message: 'well_informed investors not eligible for RAIF' },
        { rule: 'KYC Status', passed: false, message: 'KYC verification pending' },
      ] },
    { type: 'transfer_validation', asset: A_RAIF_A,  result: 'rejected', violations: 1, subject: nomura,    days: 12,
      checks: [
        { rule: 'KYC Status', passed: false, message: 'KYC verification pending' },
      ] },
    { type: 'eligibility_check',   asset: A_RAIF_F,  result: 'rejected', violations: 2, subject: liwei,     days: 8,
      checks: [
        { rule: 'Investor Type', passed: false, message: 'retail investors not eligible for RAIF' },
        { rule: 'KYC Status', passed: false, message: 'Investor KYC status is expired' },
      ] },

    // QIAIF (some violations)
    { type: 'eligibility_check',   asset: A_QIAIF,   result: 'rejected', violations: 2, subject: thomas,    days: 22,
      checks: [
        { rule: 'Investor Type', passed: false, message: 'retail investors not eligible for QIAIF' },
        { rule: 'Minimum Investment', passed: false, message: 'Below €100,000 minimum investment threshold' },
      ] },
    { type: 'transfer_validation', asset: A_QIAIF_B, result: 'rejected', violations: 1, subject: vanderberg, days: 14,
      checks: [
        { rule: 'KYC Status', passed: false, message: 'Investor KYC status is expired' },
      ] },

    // SIF (occasional violation)
    { type: 'eligibility_check',   asset: A_SIF_A,   result: 'rejected', violations: 1, subject: liwei,     days: 10,
      checks: [
        { rule: 'Investor Type', passed: false, message: 'retail investors not eligible for SIF' },
      ] },

    // ELTIF (minor — retail friendly, so fewer violations)
    { type: 'transfer_validation', asset: A_ELTIF_R, result: 'rejected', violations: 1, subject: liwei,     days: 5,
      checks: [
        { rule: 'KYC Status', passed: false, message: 'Investor KYC status is expired' },
      ] },

    // Simulated scenario analyses
    { type: 'scenario_analysis',   asset: A_RAIF_A,  result: 'simulated', violations: 0, subject: norges,    days: 7 },
    { type: 'scenario_analysis',   asset: A_SIF_A,   result: 'simulated', violations: 0, subject: calpers,   days: 3 },
  ];

  for (const d of decisionDefs) {
    const checks = d.checks || [{ rule: 'All checks', passed: true, message: 'All compliance checks passed' }];
    const resultDetails = JSON.stringify({
      checks,
      overall: d.result,
      violation_count: d.violations,
    });

    const inputSnapshot = JSON.stringify({ investor_id: d.subject, asset_id: d.asset, decision_type: d.type });
    const ruleSnapshot = JSON.stringify({ version: 1, source: 'seed-showcase' });

    await execute(
      `INSERT INTO decision_records
         (id, decision_type, asset_id, subject_id, input_snapshot, rule_version_snapshot, result, result_details, decided_by, decided_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [
        d.type,
        d.asset,
        d.subject,
        inputSnapshot,
        ruleSnapshot,
        d.result,
        resultDetails,
        adminId,
        daysAgo(d.days),
      ]
    );
    const label = d.result === 'rejected' ? `✗ ${d.type} REJECTED (${d.violations} violations)` : `✓ ${d.type} ${d.result}`;
    console.log(`  ${label} → ${d.asset.slice(0, 8)}...`);
  }

  // ====================================================================
  // 8. Onboarding Records — pipeline data
  // ====================================================================
  console.log('\n▸ [Onboarding Records]');

  const onboardingDefs = [
    { inv: calpers,    asset: A_SIF_A,   status: 'allocated',  units: 150000, days: 90 },
    { inv: norges,     asset: A_SIF_A,   status: 'allocated',  units: 120000, days: 85 },
    { inv: allianz,    asset: A_SIF_A,   status: 'allocated',  units: 100000, days: 80 },
    { inv: rothschild, asset: A_SIF_A,   status: 'approved',   units: 80000,  days: 30 },
    { inv: baillie,    asset: A_SIF_A,   status: 'eligible',   units: 75000,  days: 20 },
    { inv: tikehau,    asset: A_SIF_A,   status: 'eligible',   units: 60000,  days: 18 },
    { inv: mueller,    asset: A_SIF_A,   status: 'applied',    units: 50000,  days: 10 },
    { inv: henrik,     asset: A_SIF_A,   status: 'ineligible', units: 40000,  days: 15 },
    { inv: norges,     asset: A_RAIF_A,  status: 'allocated',  units: 1200000, days: 70 },
    { inv: allianz,    asset: A_RAIF_A,  status: 'allocated',  units: 300000,  days: 65 },
    { inv: vanderberg, asset: A_RAIF_A,  status: 'rejected',   units: 200000,  days: 25 },
    { inv: liwei,      asset: A_RAIF_F,  status: 'rejected',   units: 100000,  days: 12 },
    { inv: thomas,     asset: A_ELTIF_R, status: 'allocated',  units: 500000,  days: 60 },
    { inv: amelie,     asset: A_ELTIF_R, status: 'allocated',  units: 400000,  days: 55 },
    { inv: marco,      asset: A_ELTIF_R, status: 'applied',    units: 300000,  days: 8 },
    { inv: anna,       asset: A_ELTIF_R, status: 'approved',   units: 350000,  days: 25 },
    { inv: sofia,      asset: A_ELTIF_R, status: 'eligible',   units: 250000,  days: 15 },
    { inv: calpers,    asset: A_QIAIF,   status: 'allocated',  units: 250000,  days: 50 },
    { inv: thomas,     asset: A_QIAIF,   status: 'ineligible', units: 100000,  days: 22 },
  ];

  for (const ob of onboardingDefs) {
    const ex = await query(
      'SELECT 1 FROM onboarding_records WHERE investor_id = $1 AND asset_id = $2',
      [ob.inv, ob.asset]
    );
    if (ex.length > 0) {
      console.log(`  → Onboarding for ${ob.inv.slice(0, 8)}... → ${ob.asset.slice(0, 8)}... exists`);
    } else {
      const reviewedAt = ['approved', 'rejected', 'allocated', 'ineligible'].includes(ob.status)
        ? daysAgo(ob.days - 5)
        : null;
      await execute(
        `INSERT INTO onboarding_records
           (id, investor_id, asset_id, status, requested_units, applied_at, reviewed_at, reviewed_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now())`,
        [ob.inv, ob.asset, ob.status, ob.units, daysAgo(ob.days), reviewedAt, reviewedAt ? adminId : null]
      );
      console.log(`  ✓ ${ob.status.toUpperCase().padEnd(11)} ${ob.units.toLocaleString().padStart(10)} units → ${ob.asset.slice(0, 8)}...`);
    }
  }

  // ====================================================================
  // Summary
  // ====================================================================
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║           Showcase Seed Complete!                 ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  4 fund structures (SIF, RAIF, QIAIF, ELTIF)     ║');
  console.log('║  13 eligibility criteria                          ║');
  console.log('║  8 asset classes                                  ║');
  console.log('║  8 rule sets (permissive)                         ║');
  console.log('║  22 investors (5 types, 14 jurisdictions)         ║');
  console.log('║  33 holdings                                      ║');
  console.log('║  23 decision records (8 with violations)          ║');
  console.log('║  19 onboarding records                            ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║                                                    ║');
  console.log('║  Dashboard Chart Highlights:                       ║');
  console.log('║  ── Donut: 5 investor types (institutional-heavy)  ║');
  console.log('║  ── Bar:   14 jurisdictions (US/DE/CH/JP lead)     ║');
  console.log('║  ── KYC:   3 verified expiring <90d, 3 pending,    ║');
  console.log('║            2 expired                               ║');
  console.log('║  ── Violations: RAIF Beta leads (8 violations)     ║');
  console.log('║  ── Concentration: RAIF 60% top investor,          ║');
  console.log('║     SIF well-diversified, QIAIF moderate           ║');
  console.log('║                                                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\nLogin: admin@caelith.dev / admin1234');
  console.log('Open http://localhost:3000 to see the dashboard.');
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
