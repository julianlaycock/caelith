import { getPool } from '../src/backend/db.ts';
const pool = getPool();

async function test() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000099', true)");

    const id = '00000000-aaaa-bbbb-cccc-000000000001';
    const now = new Date().toISOString();

    // Test 1: investor INSERT
    await client.query(
      `INSERT INTO investors (id, tenant_id, name, jurisdiction, accredited, investor_type,
         kyc_status, kyc_expiry, tax_id, lei, email,
         classification_date, classification_evidence, classification_method,
         created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id, '00000000-0000-0000-0000-000000000099', 'DB Test Investor', 'DE',
        false, 'retail', 'pending', null, null, null, null,
        null, JSON.stringify([]), null, now, now,
      ]
    );
    console.log('OK: investor INSERT');

    // Test 2: audit event INSERT
    const auditId = '00000000-aaaa-bbbb-cccc-000000000002';
    await client.query(
      `INSERT INTO events (id, tenant_id, event_type, entity_type, entity_id, payload, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [auditId, '00000000-0000-0000-0000-000000000099', 'bulk_import.completed', 'system', id, '{}', now]
    );
    console.log('OK: audit event INSERT');

    await client.query('ROLLBACK');
    console.log('DONE: all inserts work, rolled back');
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    const e = err as Record<string, unknown>;
    console.error('FAILED:', e.message);
    console.error('Detail:', e.detail || 'none');
    console.error('Code:', e.code || 'none');
    console.error('Table:', err.table || 'none');
    console.error('Constraint:', err.constraint || 'none');
  } finally {
    client.release();
    await pool.end();
  }
}
test();
