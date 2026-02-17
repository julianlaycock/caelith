/**
 * Clean database and seed only the admin user (no demo data).
 * Usage: npx tsx scripts/clean-and-seed-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
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
    console.log('All data tables truncated.');

    const hash = await bcrypt.hash('Admin1234', 10);
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'System Admin', 'admin', true, now(), now())`,
      ['admin@caelith.com', hash]
    );
    console.log('Created admin@caelith.com (password: Admin1234)');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
