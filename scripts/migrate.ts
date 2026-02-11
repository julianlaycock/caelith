/**
 * Database Migration Runner - PostgreSQL
 *
 * Replaces the original sql.js migration runner.
 * Uses pg Pool from db.ts to run .sql files from migrations/ folder.
 *
 * Usage: npx tsx scripts/migrate.ts
 *
 * Behavior:
 * - Creates a `migrations` table if it doesn't exist
 * - Reads all .sql files from migrations/ sorted by number prefix
 * - Skips already-applied migrations
 * - Applies pending migrations in a transaction (each migration individually)
 * - Records applied migrations with timestamp
 * - Skips 001_initial_schema.sql (SQLite) automatically
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// SQLite migrations to skip (not compatible with PostgreSQL)
const SKIP_MIGRATIONS = new Set(['001_initial_schema.sql']);

interface Migration {
  filename: string;
  number: number;
  sql: string;
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Starting PostgreSQL migrations...\n');

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://caelith:caelith@localhost:5432/caelith',
  });

  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Get already applied migrations
    const appliedResult = await client.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const appliedMigrations = new Set(
      appliedResult.rows.map((row: { filename: string }) => row.filename)
    );

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR);
    const migrations: Migration[] = files
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => !SKIP_MIGRATIONS.has(f))
      .map((filename) => {
        const match = filename.match(/^(\d+)_/);
        const number = match ? parseInt(match[1], 10) : 0;
        const sql = fs.readFileSync(
          path.join(MIGRATIONS_DIR, filename),
          'utf-8'
        );
        return { filename, number, sql };
      })
      .sort((a, b) => a.number - b.number);

    if (migrations.length === 0) {
      console.log('⚠️  No migration files found.');
      return;
    }

    // Apply pending migrations
    let appliedCount = 0;
    for (const migration of migrations) {
      if (appliedMigrations.has(migration.filename)) {
        console.log(`✅ ${migration.filename} (already applied)`);
        continue;
      }

      console.log(`🔄 Applying ${migration.filename}...`);

      try {
        // Run each migration in its own transaction
        await client.query('BEGIN');

        // Strip the trailing rollback section (marked by "-- DOWN" or "-- ROLLBACK" header)
        // Preserves all other comments since they may be inside DO $$ blocks
        let cleanSql = migration.sql;
        const rollbackMatch = cleanSql.match(/^--\s*(DOWN|ROLLBACK)\b/im);
        if (rollbackMatch && rollbackMatch.index !== undefined) {
          cleanSql = cleanSql.substring(0, rollbackMatch.index).trim();
        }

        await client.query(cleanSql);

        // Record migration
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [migration.filename]
        );

        await client.query('COMMIT');
        console.log(`✅ ${migration.filename} applied successfully`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying ${migration.filename}:`, error);
        throw error;
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`📊 Applied ${appliedCount} new migration(s)`);
    console.log(
      `📋 Total migrations: ${migrations.length} (${migrations.length - appliedCount} previously applied)\n`
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});