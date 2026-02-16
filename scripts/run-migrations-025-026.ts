import dotenv from 'dotenv';
dotenv.config();
import { query, closeDb } from '../src/backend/db.js';

async function run() {
  // Migration 025
  await query(`ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_date DATE`);
  await query(`ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_evidence JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_method VARCHAR(50)`);
  console.log('Migration 025 done');

  // Migration 026
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS lmt_types JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_limit_commitment DECIMAL(8,2)`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_limit_gross DECIMAL(8,2)`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_current_commitment DECIMAL(8,2)`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_current_gross DECIMAL(8,2)`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS liquidity_profile JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS geographic_exposure JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS counterparty_exposure JSONB DEFAULT '[]'::jsonb`);
  console.log('Migration 026 done');

  closeDb();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
