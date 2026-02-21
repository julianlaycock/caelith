/**
 * German KVG Demo Seed — Realistic data for small German KVG compliance managers
 *
 * Creates 3 German Spezial-AIF fund structures, 12 German/DACH investors,
 * eligibility criteria referencing KAGB, onboarding records, and decision records.
 *
 * Usage: npx tsx scripts/seed-german-kvg-demo.ts
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING where possible.
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query, execute, closeDb } from '../src/backend/db.js';
import { sealAllUnsealed } from '../src/backend/services/integrity-service.js';

// ── Fixed UUIDs ──────────────────────────────────────────

const FUND_IMMO   = '20000000-0000-0000-0000-000000000001';
const FUND_WP     = '20000000-0000-0000-0000-000000000002';
const FUND_MULTI  = '20000000-0000-0000-0000-000000000003';

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
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Caelith German KVG Demo Seed — KAGB Compliance Data    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ====================================================================
  // 0. Admin User
  // ====================================================================
  console.log('▸ [Users]');
  const existingUser = await query('SELECT id FROM users WHERE email = $1', ['admin@caelith.com']);
  let adminId: string;
  if (existingUser.length > 0) {
    adminId = (existingUser[0] as { id: string }).id;
    console.log('  → admin@caelith.com exists');
  } else {
    const hash = await bcrypt.hash('admin1234', 10);
    const rows = await query<{ id: string }>(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'System Admin', 'admin', true, now(), now())
       RETURNING id`,
      ['admin@caelith.com', hash]
    );
    adminId = rows[0].id;
    console.log('  ✓ Created admin@caelith.com (password: admin1234)');
  }

  // ====================================================================
  // 1. Fund Structures — 3 German Spezial-AIFs
  // ====================================================================
  console.log('\n▸ [Fund Structures]');

  const fundDefs = [
    {
      id: FUND_IMMO, name: 'Rhein-Main Immobilien Spezial-AIF',
      form: 'Spezial_AIF', dom: 'DE', fw: 'AIFMD',
      aifm: 'Rhein-Main Capital Verwaltungsgesellschaft mbH',
      lei: '391200QFXIMK7RH8DE42', target: 150000000, date: '2023-06-01',
    },
    {
      id: FUND_WP, name: 'Süddeutsche Wertpapier Spezial-AIF',
      form: 'Spezial_AIF', dom: 'DE', fw: 'AIFMD',
      aifm: 'Süddeutsche Kapitalverwaltungsgesellschaft mbH',
      lei: '529900PLXF7B2HNMO618', target: 80000000, date: '2024-01-15',
    },
    {
      id: FUND_MULTI, name: 'Hanseatischer Multi-Asset Spezial-AIF',
      form: 'Spezial_AIF', dom: 'DE', fw: 'AIFMD',
      aifm: 'Hanseatische Fondsverwaltung GmbH',
      lei: '529900TK8N4XJWQ09Y55', target: 60000000, date: '2024-07-01',
    },
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
  // 2. Eligibility Criteria — KAGB references
  // ====================================================================
  console.log('\n▸ [Eligibility Criteria]');

  const eligCriteria = [
    // Immobilien Spezial-AIF
    { fs: FUND_IMMO, type: 'institutional',      jur: 'DE', min: 20000000, suit: false, src: '§ 1 Abs. 6 KAGB — Institutioneller Anleger' },
    { fs: FUND_IMMO, type: 'semi_professional',   jur: 'DE', min: 200000, suit: true,  src: '§ 1 Abs. 19 Nr. 33 KAGB — Semiprofessioneller Anleger (mind. €200.000)' },
    { fs: FUND_IMMO, type: 'professional',         jur: '*',  min: 0,        suit: false, src: '§ 1 Abs. 19 Nr. 32 KAGB — Professioneller Anleger' },
    { fs: FUND_IMMO, type: 'institutional',        jur: 'AT', min: 20000000, suit: false, src: '§ 1 Abs. 6 KAGB i.V.m. AIFMD Passport' },
    { fs: FUND_IMMO, type: 'institutional',        jur: 'LU', min: 20000000, suit: false, src: '§ 1 Abs. 6 KAGB i.V.m. AIFMD Passport' },

    // Wertpapier Spezial-AIF
    { fs: FUND_WP, type: 'institutional',          jur: 'DE', min: 20000000, suit: false, src: '§ 1 Abs. 6 KAGB — Institutioneller Anleger' },
    { fs: FUND_WP, type: 'semi_professional',      jur: 'DE', min: 200000, suit: true,  src: '§ 1 Abs. 19 Nr. 33 KAGB — Semiprofessioneller Anleger' },
    { fs: FUND_WP, type: 'professional',           jur: '*',  min: 0,        suit: false, src: '§ 1 Abs. 19 Nr. 32 KAGB — Professioneller Anleger' },

    // Multi-Asset Spezial-AIF
    { fs: FUND_MULTI, type: 'institutional',       jur: 'DE', min: 20000000, suit: false, src: '§ 1 Abs. 6 KAGB — Institutioneller Anleger' },
    { fs: FUND_MULTI, type: 'semi_professional',   jur: 'DE', min: 200000, suit: true,  src: '§ 1 Abs. 19 Nr. 33 KAGB — Semiprofessioneller Anleger' },
    { fs: FUND_MULTI, type: 'professional',        jur: 'CH', min: 0,        suit: false, src: '§ 1 Abs. 19 Nr. 32 KAGB — Professioneller Anleger (CH Drittstaatenvertrieb)' },
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
      console.log(`  ✓ ${c.type} (${c.jur}) → fund ...${c.fs.slice(-1)} (min €${(c.min / 100).toLocaleString()})`);
    }
  }

  // ====================================================================
  // 3. Assets — 5 share classes across 3 funds
  // ====================================================================
  console.log('\n▸ [Assets]');

  const assetDefs = [
    { name: 'Rhein-Main Immobilien – Tranche A',     fs: FUND_IMMO,  type: 'Fund',           units: 750000,  price: 200 },
    { name: 'Rhein-Main Immobilien – Tranche B',     fs: FUND_IMMO,  type: 'Fund',           units: 250000,  price: 500 },
    { name: 'Süddeutsche Wertpapier – Klasse I',     fs: FUND_WP,    type: 'Fund',           units: 800000,  price: 100 },
    { name: 'Hanseatischer Multi-Asset – Klasse A',  fs: FUND_MULTI, type: 'Fund',           units: 600000,  price: 100 },
    { name: 'Hanseatischer Multi-Asset – Klasse S',  fs: FUND_MULTI, type: 'LP Interest',    units: 200000,  price: 250 },
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

  const A_IMMO_A  = assetIds['Rhein-Main Immobilien – Tranche A'];
  const A_IMMO_B  = assetIds['Rhein-Main Immobilien – Tranche B'];
  const A_WP_I    = assetIds['Süddeutsche Wertpapier – Klasse I'];
  const A_MULTI_A = assetIds['Hanseatischer Multi-Asset – Klasse A'];
  const A_MULTI_S = assetIds['Hanseatischer Multi-Asset – Klasse S'];

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
         VALUES (gen_random_uuid(), $1, 1, true, 90, $2, NULL, now())`,
        [assetId, JSON.stringify(['DE', 'AT', 'CH', 'LU'])]
      );
      console.log(`  ✓ KAGB rules → ${name.slice(0, 45)}...`);
    }
  }

  // ====================================================================
  // 5. Investors — 12 German/DACH investors
  // ====================================================================
  console.log('\n▸ [Investors]');

  const investorDefs = [
    // ── Institutional (4) ──
    { name: 'Versorgungswerk der Ärztekammer Nordrhein',   jur: 'DE', type: 'institutional',      kyc: 'verified', expiry: daysFromNow(450), lei: '391200ABCDEF12345678' },
    { name: 'Bayerische Versorgungskammer',                jur: 'DE', type: 'institutional',      kyc: 'verified', expiry: daysFromNow(25),  lei: '529900GHIJKL90123456' },  // expiring very soon!
    { name: 'Sparkasse KölnBonn',                          jur: 'DE', type: 'institutional',      kyc: 'verified', expiry: daysFromNow(365), lei: '529900MNOPQR56789012' },
    { name: 'Pensionskasse der Mitarbeiter der Bosch-Gruppe', jur: 'DE', type: 'institutional',   kyc: 'verified', expiry: daysFromNow(200), lei: '391200STUVWX34567890' },

    // ── Professional (2) ──
    { name: 'Deutsche Apotheker- und Ärztebank eG',        jur: 'DE', type: 'professional',       kyc: 'verified', expiry: daysFromNow(300), lei: '529900YZABCD12345678' },
    { name: 'Berenberg Bank — Joh. Berenberg, Gossler & Co. KG', jur: 'DE', type: 'professional', kyc: 'pending',  expiry: null,             lei: '529900EFGHIJ90123456' },

    // ── Semi-Professional (4) ──
    { name: 'Müller Family Office GmbH',                   jur: 'DE', type: 'semi_professional',  kyc: 'verified', expiry: daysFromNow(80),  lei: null },  // expiring within 90d
    { name: 'Becker Vermögensverwaltung GmbH',             jur: 'DE', type: 'semi_professional',  kyc: 'expired',  expiry: daysFromNow(-20), lei: null },  // expired!
    { name: 'Schneider & Partner Familienstiftung',        jur: 'AT', type: 'semi_professional',  kyc: 'verified', expiry: daysFromNow(180), lei: null },
    { name: 'Zürcher Privatstiftung Weber',                jur: 'CH', type: 'semi_professional',  kyc: 'verified', expiry: daysFromNow(60),  lei: null },  // expiring within 90d

    // ── Additional institutional (DACH) ──
    { name: 'Kommunaler Versorgungsverband Baden-Württemberg', jur: 'DE', type: 'institutional',  kyc: 'pending',  expiry: null,             lei: '391200KLMNOP78901234' },
    { name: 'Luxemburger Pensionsfonds S.A.',              jur: 'LU', type: 'institutional',      kyc: 'verified', expiry: daysFromNow(500), lei: '222100QRSTUV56789012' },
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
  const aerzte      = I['Versorgungswerk der Ärztekammer Nordrhein'];
  const bvk         = I['Bayerische Versorgungskammer'];
  const sparkasse   = I['Sparkasse KölnBonn'];
  const bosch       = I['Pensionskasse der Mitarbeiter der Bosch-Gruppe'];
  const apoBank     = I['Deutsche Apotheker- und Ärztebank eG'];
  const berenberg   = I['Berenberg Bank — Joh. Berenberg, Gossler & Co. KG'];
  const mueller     = I['Müller Family Office GmbH'];
  const becker      = I['Becker Vermögensverwaltung GmbH'];
  const schneider   = I['Schneider & Partner Familienstiftung'];
  const weber       = I['Zürcher Privatstiftung Weber'];
  const kvbw        = I['Kommunaler Versorgungsverband Baden-Württemberg'];
  const luxPension  = I['Luxemburger Pensionsfonds S.A.'];

  // ====================================================================
  // 5b. Fund Structure AIFMD II / KAGB Data
  // ====================================================================
  console.log('\n▸ [Fund Structure KAGB/AIFMD II Data]');

  await execute(
    `UPDATE fund_structures SET
       lmt_types = $1, leverage_limit_commitment = 1.5, leverage_limit_gross = 2.0,
       leverage_current_commitment = 1.2, leverage_current_gross = 1.6,
       liquidity_profile = $2, geographic_exposure = $3, counterparty_exposure = $4
     WHERE id = $5`,
    [
      JSON.stringify([
        { type: 'redemption_gate', description: 'Halbjährliche Rücknahme, Gate bei 10% des NAV', threshold_pct: 10, active: true },
        { type: 'notice_period', description: '12 Monate Kündigungsfrist gem. Anlagebedingungen', active: true },
      ]),
      JSON.stringify([
        { bucket: '1d', pct: 0 }, { bucket: '2-7d', pct: 0 }, { bucket: '8-30d', pct: 2 },
        { bucket: '31-90d', pct: 5 }, { bucket: '91-180d', pct: 8 }, { bucket: '181-365d', pct: 25 }, { bucket: '>365d', pct: 60 },
      ]),
      JSON.stringify([
        { region: 'Deutschland', pct: 70 }, { region: 'Österreich', pct: 15 },
        { region: 'Benelux', pct: 10 }, { region: 'Schweiz', pct: 5 },
      ]),
      JSON.stringify([
        { name: 'Deutsche Bank AG', lei: '7LTWFZYICNSX8D621K86', exposure_pct: 8.5 },
        { name: 'Commerzbank AG', lei: '851WYGNLUQLFZBSYGB56', exposure_pct: 5.2 },
      ]),
      FUND_IMMO,
    ]
  );
  console.log('  ✓ Rhein-Main Immobilien — LMT, Leverage, Liquidität, Geographie');

  await execute(
    `UPDATE fund_structures SET
       lmt_types = $1, leverage_limit_commitment = 2.0, leverage_limit_gross = 3.0,
       leverage_current_commitment = 1.6, leverage_current_gross = 2.4,
       liquidity_profile = $2, geographic_exposure = $3, counterparty_exposure = $4
     WHERE id = $5`,
    [
      JSON.stringify([
        { type: 'swing_pricing', description: 'Swing-Faktor ±1,5% bei Nettomittelabfluss >5% NAV', active: true },
        { type: 'notice_period', description: '90 Tage Kündigungsfrist', active: true },
      ]),
      JSON.stringify([
        { bucket: '1d', pct: 8 }, { bucket: '2-7d', pct: 15 }, { bucket: '8-30d', pct: 25 },
        { bucket: '31-90d', pct: 25 }, { bucket: '91-180d', pct: 15 }, { bucket: '181-365d', pct: 8 }, { bucket: '>365d', pct: 4 },
      ]),
      JSON.stringify([
        { region: 'Deutschland', pct: 40 }, { region: 'Eurozone (ex DE)', pct: 35 },
        { region: 'Nordamerika', pct: 15 }, { region: 'Asien-Pazifik', pct: 10 },
      ]),
      JSON.stringify([
        { name: 'DZ BANK AG', lei: '529900HNOAA1KXQJUQ27', exposure_pct: 10.0 },
        { name: 'BayernLB', lei: '549300JXBYQFKTI1GK31', exposure_pct: 7.3 },
        { name: 'LBBW', lei: '549300TLSAML0K87HR62', exposure_pct: 4.8 },
      ]),
      FUND_WP,
    ]
  );
  console.log('  ✓ Süddeutsche Wertpapier — LMT, Leverage, Liquidität, Geographie');

  await execute(
    `UPDATE fund_structures SET
       lmt_types = $1, leverage_limit_commitment = 1.8, leverage_limit_gross = 2.5,
       leverage_current_commitment = 1.3, leverage_current_gross = 1.9,
       liquidity_profile = $2, geographic_exposure = $3, counterparty_exposure = $4
     WHERE id = $5`,
    [
      JSON.stringify([
        { type: 'redemption_gate', description: 'Vierteljährliche Rücknahme, Gate bei 20% des NAV', threshold_pct: 20, active: true },
        { type: 'suspension', description: 'Aussetzung bei außergewöhnlichen Umständen gem. § 98 KAGB', active: false },
      ]),
      JSON.stringify([
        { bucket: '1d', pct: 5 }, { bucket: '2-7d', pct: 10 }, { bucket: '8-30d', pct: 15 },
        { bucket: '31-90d', pct: 20 }, { bucket: '91-180d', pct: 20 }, { bucket: '181-365d', pct: 18 }, { bucket: '>365d', pct: 12 },
      ]),
      JSON.stringify([
        { region: 'Deutschland', pct: 50 }, { region: 'Eurozone (ex DE)', pct: 25 },
        { region: 'Schweiz', pct: 10 }, { region: 'Nordamerika', pct: 10 }, { region: 'Sonstige', pct: 5 },
      ]),
      JSON.stringify([
        { name: 'Helaba', lei: '5299003HKZGMPAQX4S46', exposure_pct: 6.5 },
        { name: 'DekaBank', lei: '549300SIM65QDBLKXM53', exposure_pct: 4.1 },
      ]),
      FUND_MULTI,
    ]
  );
  console.log('  ✓ Hanseatischer Multi-Asset — LMT, Leverage, Liquidität, Geographie');

  // ====================================================================
  // 5c. Investor Classification Evidence (KAGB-specific)
  // ====================================================================
  console.log('\n▸ [Investor Classification Evidence]');

  const now = new Date().toISOString().split('T')[0];
  const recentDate = new Date().toISOString();

  if (aerzte) {
    await execute(
      `UPDATE investors SET classification_method = $1, classification_date = $2, classification_evidence = $3 WHERE id = $4`,
      [
        'regulatory_status', now,
        JSON.stringify([{ type: 'regulatory_license', document_ref: 'BaFin-Registrierung Versorgungswerk, Az. WA-2023-0815', verified_at: recentDate, verified_by: 'admin@caelith.com' }]),
        aerzte,
      ]
    );
    console.log('  ✓ Versorgungswerk Ärztekammer — regulatory_status (BaFin)');
  }

  if (mueller) {
    await execute(
      `UPDATE investors SET classification_method = $1, classification_date = $2, classification_evidence = $3 WHERE id = $4`,
      [
        'self_declaration', now,
        JSON.stringify([
          { type: 'wealth_declaration', document_ref: 'Erklärung semiprofessioneller Anleger gem. § 1 Abs. 19 Nr. 33 KAGB', verified_at: recentDate, verified_by: 'admin@caelith.com' },
          { type: 'experience_assessment', document_ref: 'Sachkundeprüfung / Erfahrungsnachweis Müller-FO-2024', verified_at: recentDate, verified_by: 'admin@caelith.com' },
        ]),
        mueller,
      ]
    );
    console.log('  ✓ Müller Family Office — self_declaration (§ 1 Abs. 19 Nr. 33 KAGB)');
  }

  if (apoBank) {
    await execute(
      `UPDATE investors SET classification_method = $1, classification_date = $2, classification_evidence = $3 WHERE id = $4`,
      [
        'documentation', now,
        JSON.stringify([{ type: 'mifid_classification', document_ref: 'MiFID II Professioneller Kunde — Einstufungsbescheid apoBank Ref. PK-2024-4711', verified_at: recentDate, verified_by: 'admin@caelith.com' }]),
        apoBank,
      ]
    );
    console.log('  ✓ Deutsche Apotheker- und Ärztebank — documentation (MiFID II)');
  }

  // ====================================================================
  // 6. Holdings — realistic German Spezial-AIF allocations
  // ====================================================================
  console.log('\n▸ [Holdings]');

  const holdingDefs = [
    // ── Rhein-Main Immobilien Tranche A (750K units @ €200) ──
    { inv: aerzte,     asset: A_IMMO_A, units: 150000, label: 'Ärztekammer → Immo A' },
    { inv: bvk,        asset: A_IMMO_A, units: 200000, label: 'Bayer. Versorgungsk. → Immo A' },
    { inv: sparkasse,  asset: A_IMMO_A, units: 100000, label: 'Sparkasse KölnBonn → Immo A' },
    { inv: bosch,      asset: A_IMMO_A, units: 80000,  label: 'Bosch Pensionskasse → Immo A' },
    { inv: mueller,    asset: A_IMMO_A, units: 50000,  label: 'Müller FO → Immo A' },
    { inv: luxPension, asset: A_IMMO_A, units: 60000,  label: 'Lux. Pensionsfonds → Immo A' },

    // ── Rhein-Main Immobilien Tranche B (250K units @ €500) ──
    { inv: bvk,        asset: A_IMMO_B, units: 80000,  label: 'Bayer. Versorgungsk. → Immo B' },
    { inv: apoBank,    asset: A_IMMO_B, units: 60000,  label: 'apoBank → Immo B' },

    // ── Süddeutsche Wertpapier Klasse I (800K units @ €100) — CONCENTRATED ──
    { inv: bvk,        asset: A_WP_I,   units: 350000, label: 'Bayer. Versorgungsk. → WP I (DOMINANT)' },
    { inv: sparkasse,  asset: A_WP_I,   units: 150000, label: 'Sparkasse KölnBonn → WP I' },
    { inv: apoBank,    asset: A_WP_I,   units: 120000, label: 'apoBank → WP I' },
    { inv: schneider,  asset: A_WP_I,   units: 60000,  label: 'Schneider Stiftung → WP I' },
    { inv: weber,      asset: A_WP_I,   units: 40000,  label: 'Weber Stiftung → WP I' },

    // ── Hanseatischer Multi-Asset Klasse A (600K units @ €100) ──
    { inv: aerzte,     asset: A_MULTI_A, units: 120000, label: 'Ärztekammer → Multi A' },
    { inv: sparkasse,  asset: A_MULTI_A, units: 100000, label: 'Sparkasse KölnBonn → Multi A' },
    { inv: bosch,      asset: A_MULTI_A, units: 80000,  label: 'Bosch Pensionskasse → Multi A' },
    { inv: mueller,    asset: A_MULTI_A, units: 40000,  label: 'Müller FO → Multi A' },

    // ── Hanseatischer Multi-Asset Klasse S (200K units @ €250) ──
    { inv: apoBank,    asset: A_MULTI_S, units: 80000,  label: 'apoBank → Multi S' },
    { inv: schneider,  asset: A_MULTI_S, units: 50000,  label: 'Schneider Stiftung → Multi S' },
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
  // 7. Decision Records — KAGB compliance checks
  // ====================================================================
  console.log('\n▸ [Decision Records]');

  const decisionDefs = [
    // ── Approved decisions ──
    { type: 'transfer_validation', asset: A_IMMO_A,  result: 'approved', violations: 0, subject: aerzte,    days: 45 },
    { type: 'transfer_validation', asset: A_IMMO_A,  result: 'approved', violations: 0, subject: bvk,       days: 40 },
    { type: 'eligibility_check',   asset: A_IMMO_A,  result: 'approved', violations: 0, subject: sparkasse, days: 55 },
    { type: 'eligibility_check',   asset: A_WP_I,    result: 'approved', violations: 0, subject: bvk,       days: 50 },
    { type: 'onboarding_approval', asset: A_WP_I,    result: 'approved', violations: 0, subject: apoBank,   days: 35 },
    { type: 'transfer_validation', asset: A_MULTI_A, result: 'approved', violations: 0, subject: aerzte,    days: 30 },
    { type: 'eligibility_check',   asset: A_MULTI_A, result: 'approved', violations: 0, subject: bosch,     days: 28 },
    { type: 'eligibility_check',   asset: A_IMMO_B,  result: 'approved', violations: 0, subject: apoBank,   days: 22 },

    // ── Rejected / violated decisions ──
    { type: 'transfer_validation', asset: A_IMMO_A,  result: 'rejected', violations: 2, subject: becker,    days: 18,
      checks: [
        { rule: 'KYC-Status', passed: false, message: 'KYC-Verifizierung abgelaufen — Erneuerung gem. GwG erforderlich' },
        { rule: 'Mindestanlage', passed: false, message: 'Zeichnungsbetrag unter Mindestanlage €200.000 gem. Anlagebedingungen' },
      ] },
    { type: 'eligibility_check',   asset: A_WP_I,   result: 'rejected', violations: 2, subject: berenberg, days: 15,
      checks: [
        { rule: 'KYC-Status', passed: false, message: 'KYC-Prüfung ausstehend — BaFin-Anforderungen nicht erfüllt' },
        { rule: 'Anlegereinstufung', passed: false, message: 'Nachweis professioneller Anlegerstatus gem. § 1 Abs. 19 Nr. 32 KAGB fehlt' },
      ] },
    { type: 'transfer_validation', asset: A_IMMO_A,  result: 'rejected', violations: 3, subject: kvbw,     days: 12,
      checks: [
        { rule: 'KYC-Status', passed: false, message: 'KYC-Verifizierung ausstehend' },
        { rule: 'Konzentrationslimit', passed: false, message: 'Übertragung würde Konzentrationslimit von 30% überschreiten' },
        { rule: 'Jurisdiktion', passed: false, message: 'Anlegerklassifizierung noch nicht abgeschlossen' },
      ] },
    { type: 'eligibility_check',   asset: A_MULTI_S, result: 'rejected', violations: 1, subject: becker,   days: 8,
      checks: [
        { rule: 'KYC-Status', passed: false, message: 'Anleger-KYC abgelaufen seit 20 Tagen — Handel gesperrt gem. GwG § 10' },
      ] },
    { type: 'transfer_validation', asset: A_WP_I,    result: 'rejected', violations: 1, subject: weber,    days: 5,
      checks: [
        { rule: 'Drittstaatenvertrieb', passed: false, message: 'CH-Anleger: Vertriebsanzeige gem. § 330 KAGB nicht vollständig' },
      ] },

    // Simulated scenario analyses
    { type: 'scenario_analysis',   asset: A_WP_I,    result: 'simulated', violations: 0, subject: bvk,     days: 3 },
    { type: 'scenario_analysis',   asset: A_IMMO_A,  result: 'simulated', violations: 0, subject: aerzte,  days: 2 },
  ];

  for (const d of decisionDefs) {
    const checks = (d as Record<string, unknown>).checks || [{ rule: 'Alle Prüfungen', passed: true, message: 'Alle Compliance-Prüfungen bestanden' }];
    const resultDetails = JSON.stringify({
      checks,
      overall: d.result,
      violation_count: d.violations,
    });

    const inputSnapshot = JSON.stringify({ investor_id: d.subject, asset_id: d.asset, decision_type: d.type });
    const ruleSnapshot = JSON.stringify({ version: 1, source: 'seed-german-kvg-demo', regulatory_authority: 'BaFin' });

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
    const label = d.result === 'rejected' ? `✗ ${d.type} ABGELEHNT (${d.violations} Verstöße)` : `✓ ${d.type} ${d.result}`;
    console.log(`  ${label}`);
  }

  // ====================================================================
  // 8. Onboarding Records — pipeline data
  // ====================================================================
  console.log('\n▸ [Onboarding Records]');

  const onboardingDefs = [
    { inv: aerzte,     asset: A_IMMO_A,  status: 'allocated',  units: 150000, days: 90 },
    { inv: bvk,        asset: A_IMMO_A,  status: 'allocated',  units: 200000, days: 85 },
    { inv: sparkasse,  asset: A_IMMO_A,  status: 'allocated',  units: 100000, days: 80 },
    { inv: bosch,      asset: A_IMMO_A,  status: 'approved',   units: 80000,  days: 30 },
    { inv: mueller,    asset: A_IMMO_A,  status: 'eligible',   units: 50000,  days: 20 },
    { inv: luxPension, asset: A_IMMO_A,  status: 'applied',    units: 60000,  days: 10 },
    { inv: becker,     asset: A_IMMO_A,  status: 'rejected',   units: 30000,  days: 18 },
    { inv: kvbw,       asset: A_IMMO_A,  status: 'rejected',   units: 100000, days: 12 },
    { inv: bvk,        asset: A_WP_I,    status: 'allocated',  units: 350000, days: 70 },
    { inv: sparkasse,  asset: A_WP_I,    status: 'allocated',  units: 150000, days: 65 },
    { inv: apoBank,    asset: A_WP_I,    status: 'allocated',  units: 120000, days: 60 },
    { inv: berenberg,  asset: A_WP_I,    status: 'applied',    units: 80000,  days: 15 },
    { inv: schneider,  asset: A_WP_I,    status: 'eligible',   units: 60000,  days: 25 },
    { inv: aerzte,     asset: A_MULTI_A, status: 'allocated',  units: 120000, days: 50 },
    { inv: sparkasse,  asset: A_MULTI_A, status: 'approved',   units: 100000, days: 28 },
    { inv: mueller,    asset: A_MULTI_A, status: 'applied',    units: 40000,  days: 8 },
    { inv: weber,      asset: A_WP_I,    status: 'ineligible', units: 40000,  days: 5 },
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
  // 9. SFDR Classification
  // ====================================================================
  console.log('\n▸ [SFDR Classification]');

  await execute(
    `UPDATE fund_structures SET sfdr_classification = 'article_9' WHERE id = $1`,
    [FUND_IMMO]
  );
  console.log('  ✓ Rhein-Main Immobilien → Article 9 (sustainable investment objective)');

  await execute(
    `UPDATE fund_structures SET sfdr_classification = 'article_6' WHERE id = $1`,
    [FUND_WP]
  );
  console.log('  ✓ Süddeutsche Wertpapier → Article 6 (no sustainability integration)');

  await execute(
    `UPDATE fund_structures SET sfdr_classification = 'article_8' WHERE id = $1`,
    [FUND_MULTI]
  );
  console.log('  ✓ Hanseatischer Multi-Asset → Article 8 (promotes E/S characteristics)');

  // ====================================================================
  // 10. Transfers — sample transfer records
  // ====================================================================
  console.log('\n▸ [Transfers]');

  const transferDefs = [
    { from: aerzte,    to: sparkasse, asset: A_IMMO_A, units: 10000, status: 'executed',          days: 30 },
    { from: bvk,       to: bosch,     asset: A_IMMO_A, units: 25000, status: 'executed',          days: 20 },
    { from: sparkasse, to: mueller,   asset: A_MULTI_A, units: 15000, status: 'executed',          days: 15 },
    { from: apoBank,   to: schneider, asset: A_WP_I,   units: 20000, status: 'pending_approval',  days: 3 },
    { from: bvk,       to: aerzte,    asset: A_IMMO_A, units: 30000, status: 'pending_approval',  days: 1 },
    { from: schneider, to: weber,     asset: A_MULTI_S, units: 5000,  status: 'rejected',          days: 10 },
    { from: mueller,   to: becker,    asset: A_IMMO_A, units: 8000,  status: 'rejected',          days: 7 },
  ];

  for (const t of transferDefs) {
    const ex = await query(
      'SELECT 1 FROM transfers WHERE from_investor_id = $1 AND to_investor_id = $2 AND asset_id = $3 AND units = $4',
      [t.from, t.to, t.asset, t.units]
    );
    if (ex.length > 0) {
      console.log(`  → Transfer ${t.from.slice(0, 8)}→${t.to.slice(0, 8)} exists`);
    } else {
      await execute(
        `INSERT INTO transfers
           (id, asset_id, from_investor_id, to_investor_id, units, status, executed_at, rejection_reason, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now())`,
        [
          t.asset, t.from, t.to, t.units, t.status,
          daysAgo(t.days),
          t.status === 'rejected' ? 'Compliance-Verstoß: KYC-Status nicht verifiziert' : null,
        ]
      );
      console.log(`  ✓ ${t.status.toUpperCase().padEnd(18)} ${t.units.toLocaleString().padStart(8)} units (${t.asset.slice(0, 8)}...)`);
    }
  }

  // ====================================================================
  // 9. Investor Documents (with expiry dates for calendar testing)
  // ====================================================================
  console.log('\n── Investor Documents ──');
  // Get tenant ID from an existing investor
  const tenantRows = await query<{ tenant_id: string }>(`SELECT tenant_id FROM investors LIMIT 1`);
  const TENANT_ID = tenantRows[0]?.tenant_id;
  if (!TENANT_ID) { console.log('  ⚠ No tenant found, skipping documents'); }
  const docDefs = [
    // daysAgo(-N) = N days in the future, daysAgo(N) = N days in the past
    { investor: 'Bayerische Versorgungskammer', type: 'KYC_identity', filename: 'BVK_Handelsregister.pdf', expiry: daysAgo(-45), status: 'verified' },
    { investor: 'Bayerische Versorgungskammer', type: 'AML_screening', filename: 'BVK_AML_Screening_2025.pdf', expiry: daysAgo(-10), status: 'verified' },
    { investor: 'Sparkasse KölnBonn', type: 'KYC_identity', filename: 'SKB_Ausweis.pdf', expiry: daysAgo(15), status: 'expired' },
    { investor: 'Pensionskasse der Mitarbeiter der Bosch-Gruppe', type: 'proof_of_institutional_status', filename: 'Bosch_Institutsbescheinigung.pdf', expiry: daysAgo(-120), status: 'verified' },
    { investor: 'Deutsche Apotheker- und Ärztebank eG', type: 'MiFID_professional_classification', filename: 'ApoBank_MiFID_Einstufung.pdf', expiry: daysAgo(-60), status: 'verified' },
    { investor: 'Schneider & Partner Familienstiftung', type: 'source_of_funds', filename: 'Schneider_Mittelherkunft.pdf', expiry: daysAgo(30), status: 'expired' },
    { investor: 'Müller Family Office GmbH', type: 'suitability_questionnaire', filename: 'Mueller_Eignungsfragebogen.pdf', expiry: daysAgo(90), status: 'expired' },
    { investor: 'Becker Vermögensverwaltung GmbH', type: 'semi_professional_declaration', filename: 'Becker_Semi_Prof_Erklaerung.pdf', expiry: daysAgo(-25), status: 'verified' },
  ];

  for (const doc of (TENANT_ID ? docDefs : [])) {
    const invId = I[doc.investor];
    if (!invId) { console.log(`  ⚠ Investor not found: ${doc.investor}`); continue; }
    try {
      const ex = await query<{ id: string }>(
        `SELECT id FROM investor_documents WHERE investor_id = $1 AND document_type = $2 AND tenant_id = $3 LIMIT 1`,
        [invId, doc.type, TENANT_ID]
      );
      if (ex.length > 0) {
        console.log(`  → ${doc.investor} ${doc.type} exists`);
      } else {
        await execute(
          `INSERT INTO investor_documents
             (id, tenant_id, investor_id, document_type, filename, mime_type, file_size, file_data, status, expiry_date, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'application/pdf', 1024, $5, $6, $7, now(), now())`,
          [TENANT_ID, invId, doc.type, doc.filename, Buffer.from('placeholder'), doc.status, doc.expiry]
        );
        console.log(`  ✓ ${doc.investor} — ${doc.type} (expires: ${doc.expiry?.slice(0,10) || 'n/a'})`);
      }
    } catch (docErr: any) {
      console.log(`  ✗ ${doc.investor} — ${doc.type}: ${docErr.message}`);
    }
  }

  // ====================================================================
  // Summary
  // ====================================================================
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           German KVG Demo Seed Complete!                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  3 Fondsstrukturen (Immobilien, Wertpapier, Multi-Asset) ║');
  console.log('║  11 Zulassungskriterien (KAGB §§)                        ║');
  console.log('║  5 Anteilklassen                                         ║');
  console.log('║  5 Regelwerke (KAGB-konform, DE/AT/CH/LU Whitelist)      ║');
  console.log('║  12 Investoren (institutional/professional/semi-prof.)    ║');
  console.log('║  20 Beteiligungen                                        ║');
  console.log('║  17 Entscheidungsprotokolle (5 mit Verstößen)             ║');
  console.log('║  17 Onboarding-Datensätze                                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log('║  Dashboard-Highlights:                                    ║');
  console.log('║  ── KYC: 2 bald ablaufend (<90d), 1 abgelaufen,          ║');
  console.log('║          2 ausstehend                                     ║');
  console.log('║  ── Verstöße: GwG, KAGB-Einstufung, Konzentration        ║');
  console.log('║  ── Konzentration: Süddeutsche WP (BVK ~44% dominant)    ║');
  console.log('║  ── Jurisdiktionen: DE, AT, CH, LU                       ║');
  console.log('║  ── BaFin als Aufsichtsbehörde referenziert               ║');
  console.log('║                                                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const sealed = await sealAllUnsealed();
  console.log(`\nSealed ${sealed} decision records`);
  console.log('\nLogin: admin@caelith.com / admin1234');
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
