/**
 * Demo Reset — one-command wipe + reseed for ALFI demo
 *
 * Usage:
 *   npx tsx scripts/demo-reset.ts            # Fresh start (Setup Wizard)
 *   npx tsx scripts/demo-reset.ts --with-data # Pre-populated (1 fund, 4 investors)
 *
 * Wipes all application data, creates a demo user, and optionally seeds
 * a small data set so you can skip the import flow and go straight to
 * the onboarding / eligibility demo.
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const withData = process.argv.includes('--with-data');

// Fixed IDs for predictable demos
const USER_ID   = 'aaaaaaaa-0000-0000-0000-000000000001';
const FUND_ID   = 'bbbbbbbb-0000-0000-0000-000000000001';
const ASSET_ID  = 'cccccccc-0000-0000-0000-000000000001';
const INV1_ID   = 'dddddddd-0000-0000-0000-000000000001';
const INV2_ID   = 'dddddddd-0000-0000-0000-000000000002';
const INV3_ID   = 'dddddddd-0000-0000-0000-000000000003';
const INV4_ID   = 'dddddddd-0000-0000-0000-000000000004';
const RULE_ID   = 'eeeeeeee-0000-0000-0000-000000000001';
const TENANT    = '00000000-0000-0000-0000-000000000099';

async function main() {
  const client = await pool.connect();
  try {
    console.log('\n  Caelith Demo Reset');
    console.log('  ==================\n');

    // ── 1. Truncate all data ───────────────────────────────
    await client.query(`
      TRUNCATE TABLE
        events,
        decision_records,
        onboarding_records,
        holdings,
        eligibility_criteria,
        composite_rules,
        rule_versions,
        rules,
        investors,
        assets,
        fund_structures,
        transfers,
        webhook_deliveries,
        webhooks,
        refresh_tokens,
        login_attempts,
        users
      CASCADE
    `);
    console.log('  [1/3] All tables truncated.');

    // ── 2. Create demo user ────────────────────────────────
    const hash = await bcrypt.hash('Demo1234!', 10);
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, 'Demo User', 'admin', true, now(), now())`,
      [USER_ID, 'demo@caelith.io', hash]
    );
    console.log('  [2/3] Created demo@caelith.io (password: Demo1234!)');

    // ── 3. Optionally seed data ────────────────────────────
    if (withData) {
      // Fund structure
      await client.query(
        `INSERT INTO fund_structures (id, tenant_id, name, legal_form, domicile, regulatory_framework, status, created_at, updated_at)
         VALUES ($1, $2, 'Caelith Demo SIF', 'SIF', 'LU', 'AIFMD', 'active', now(), now())`,
        [FUND_ID, TENANT]
      );

      // Share class (asset)
      await client.query(
        `INSERT INTO assets (id, tenant_id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
         VALUES ($1, $2, 'Share Class A', 'share_class', 100000, $3, 100, now())`,
        [ASSET_ID, TENANT, FUND_ID]
      );

      // 4 investors — one per classification
      const investors = [
        { id: INV1_ID, name: 'Rhine Capital GmbH',       jurisdiction: 'DE', type: 'institutional',     kyc: 'verified' },
        { id: INV2_ID, name: 'Moselle Partners SA',       jurisdiction: 'LU', type: 'professional',      kyc: 'verified' },
        { id: INV3_ID, name: 'Loire Holdings SAS',        jurisdiction: 'FR', type: 'well_informed',     kyc: 'verified' },
        { id: INV4_ID, name: 'Alpine Wealth Management',  jurisdiction: 'CH', type: 'semi_professional', kyc: 'pending'  },
      ];

      for (const inv of investors) {
        await client.query(
          `INSERT INTO investors (id, tenant_id, name, jurisdiction, investor_type, kyc_status, accredited, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())`,
          [inv.id, TENANT, inv.name, inv.jurisdiction, inv.type, inv.kyc]
        );
      }

      // Eligibility rule for the fund
      await client.query(
        `INSERT INTO eligibility_criteria (id, tenant_id, fund_structure_id, jurisdiction, investor_type, minimum_investment, effective_date, created_at)
         VALUES ($1, $2, $3, 'LU', 'professional', 125000, now(), now())`,
        [RULE_ID, TENANT, FUND_ID]
      );

      console.log('  [3/3] Seeded: 1 fund, 1 asset, 4 investors, 1 eligibility rule.');
    } else {
      console.log('  [3/3] No data seeded (fresh start).');
    }

    console.log('\n  Ready! Open http://localhost:3000/login');
    console.log('  Email:    demo@caelith.io');
    console.log('  Password: Demo1234!\n');
    if (!withData) {
      console.log('  Tip: Run with --with-data to skip CSV import and go straight to onboarding.\n');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Demo reset failed:', e);
  process.exit(1);
});
