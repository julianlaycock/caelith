/**
 * Create an empty "Import Demo" account — no seed data at all.
 * Perfect for demoing the CSV import flow from a blank state.
 *
 * Usage: npx tsx scripts/create-empty-demo-account.ts
 *
 * Runs against both LOCAL and RAILWAY databases.
 */
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const TENANT_ID = '11111111-0000-0000-0000-000000000001';
const USER_ID   = '11111111-0000-0000-0000-aaaaaaaaaaaa';

const LOCAL_URL   = 'postgresql://caelith:caelith@localhost:5432/caelith';
const RAILWAY_URL = 'postgresql://postgres:RisaEULespGheopLYlUQlXcAJxGCNTEI@tramway.proxy.rlwy.net:33162/railway';

async function seedAccount(dbUrl: string, label: string) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('rlwy.net') ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();

  try {
    console.log(`\n── ${label} ──`);

    // Create tenant if not exists
    const existingTenant = await client.query('SELECT id FROM tenants WHERE id = $1', [TENANT_ID]);
    if (existingTenant.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (id, name, slug, settings, max_funds, max_investors, status, created_at, updated_at)
         VALUES ($1, 'Import Demo', 'import-demo', '{}', 10, 500, 'active', now(), now())`,
        [TENANT_ID]
      );
      console.log('  ✓ Created tenant: Import Demo');
    } else {
      console.log('  → Tenant already exists');
    }

    // Check if user already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', ['import-demo@caelith.tech']);
    if (existing.rows.length > 0) {
      console.log('  ⚠ import-demo@caelith.tech already exists — skipping user creation.');
      return;
    }

    const hash = await bcrypt.hash('Demo1234', 10);

    await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())`,
      [USER_ID, TENANT_ID, 'import-demo@caelith.tech', hash, 'Thomas Weber', 'admin']
    );

    console.log('  ✓ Created user: import-demo@caelith.tech / Demo1234 (admin)');
    console.log('  ✓ No data seeded — account is completely empty.');
  } catch (err: any) {
    // Handle unique constraint violations gracefully
    if (err.code === '23505') {
      console.log('  ⚠ User or tenant already exists (unique constraint) — skipping.');
    } else {
      throw err;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Caelith — Create Empty Import Demo Account             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await seedAccount(LOCAL_URL, 'LOCAL DATABASE');
  await seedAccount(RAILWAY_URL, 'RAILWAY DATABASE');

  console.log('\n  Login: import-demo@caelith.tech / Demo1234');
  console.log('  Ready for CSV import demo!\n');
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
