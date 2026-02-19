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

    const adminHash = await bcrypt.hash('Admin1234', 10);
    const demoHash = await bcrypt.hash('Demo1234', 10);

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at) VALUES
       (gen_random_uuid(), $1, $2, 'Julian Laycock', 'admin', true, now(), now()),
       (gen_random_uuid(), $3, $4, 'Demo User', 'viewer', true, now(), now()),
       (gen_random_uuid(), $5, $4, 'Lisa Müller', 'compliance_officer', true, now(), now())`,
      ['admin@caelith.com', adminHash, 'demo@caelith.tech', demoHash, 'compliance@caelith.tech']
    );
    console.log('Created 3 accounts:');
    console.log('  admin@caelith.com / Admin1234 (admin)');
    console.log('  demo@caelith.tech / Demo1234 (viewer)');
    console.log('  compliance@caelith.tech / Demo1234 (compliance_officer)');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
