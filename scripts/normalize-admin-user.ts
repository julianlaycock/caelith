/**
 * Normalize admin account identity to a single canonical email.
 *
 * Canonical: admin@caelith.com
 * Legacy:    admin@caelith.dev
 *
 * This script merges legacy references into the canonical user id
 * across all known user FK columns, then removes the duplicate user.
 */

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { query, execute, closeDb } from '../src/backend/db.js';

dotenv.config();

const CANONICAL_EMAIL = 'admin@caelith.com';
const LEGACY_EMAIL = 'admin@caelith.dev';
const DEFAULT_PASSWORD = 'Admin1234';

interface UserRow {
  id: string;
  email: string;
}

async function createCanonicalAdmin(): Promise<void> {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await execute(
    `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'System Admin', 'admin', true, now(), now())`,
    [CANONICAL_EMAIL, hash]
  );
  console.log(`[normalize-admin] Created ${CANONICAL_EMAIL} (password: ${DEFAULT_PASSWORD})`);
}

async function mergeUserReferences(primaryId: string, duplicateId: string): Promise<void> {
  await execute('BEGIN');
  try {
    await execute(`UPDATE decision_records SET decided_by = $1 WHERE decided_by = $2`, [primaryId, duplicateId]);
    await execute(`UPDATE onboarding_records SET reviewed_by = $1 WHERE reviewed_by = $2`, [primaryId, duplicateId]);
    await execute(`UPDATE rule_versions SET created_by = $1 WHERE created_by = $2`, [primaryId, duplicateId]);
    await execute(`UPDATE webhooks SET created_by = $1 WHERE created_by = $2`, [primaryId, duplicateId]);
    await execute(`UPDATE composite_rules SET created_by = $1 WHERE created_by = $2`, [primaryId, duplicateId]);
    await execute(`DELETE FROM users WHERE id = $1`, [duplicateId]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

async function normalizeAdminIdentity(): Promise<void> {
  const canonical = await query<UserRow>(
    `SELECT id, email FROM users WHERE email = $1`,
    [CANONICAL_EMAIL]
  );
  const legacy = await query<UserRow>(
    `SELECT id, email FROM users WHERE email = $1`,
    [LEGACY_EMAIL]
  );

  if (canonical.length === 0 && legacy.length === 0) {
    await createCanonicalAdmin();
    return;
  }

  if (canonical.length === 1 && legacy.length === 0) {
    console.log(`[normalize-admin] Already normalized (${CANONICAL_EMAIL})`);
    return;
  }

  if (canonical.length === 0 && legacy.length === 1) {
    await execute(
      `UPDATE users SET email = $1, updated_at = now() WHERE id = $2`,
      [CANONICAL_EMAIL, legacy[0].id]
    );
    console.log(`[normalize-admin] Renamed ${LEGACY_EMAIL} -> ${CANONICAL_EMAIL}`);
    return;
  }

  if (canonical.length === 1 && legacy.length === 1) {
    await mergeUserReferences(canonical[0].id, legacy[0].id);
    console.log(
      `[normalize-admin] Merged duplicate admin users into ${CANONICAL_EMAIL}`
    );
    return;
  }

  throw new Error(
    `Unexpected admin identity state (canonical=${canonical.length}, legacy=${legacy.length})`
  );
}

normalizeAdminIdentity()
  .then(async () => {
    const rows = await query<UserRow>(
      `SELECT id, email FROM users WHERE email IN ($1, $2) ORDER BY email`,
      [CANONICAL_EMAIL, LEGACY_EMAIL]
    );
    console.log('[normalize-admin] Remaining admin identity rows:');
    for (const row of rows) {
      console.log(`  - ${row.email} (${row.id})`);
    }
    await closeDb();
  })
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[normalize-admin] Failed: ${message}`);
    await closeDb();
    process.exit(1);
  });
