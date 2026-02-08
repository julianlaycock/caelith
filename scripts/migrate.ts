import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/registry.db');
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

interface Migration {
  filename: string;
  number: number;
  sql: string;
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Starting database migrations...\n');

  try {
    // Initialize sql.js
    const SQL = await initSqlJs();

    // Check if database exists
    let db: initSqlJs.Database;
    const dbExists = fs.existsSync(DB_PATH);

    if (dbExists) {
      console.log('📂 Loading existing database...');
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      console.log('📂 Creating new database...');
      // Ensure data directory exists
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      db = new SQL.Database();
    }

    // Create migrations tracking table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get already applied migrations
    const appliedMigrations = new Set<string>();
    const result = db.exec('SELECT filename FROM migrations');
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach((row) => {
        appliedMigrations.add(row[0] as string);
      });
    }

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR);
    const migrations: Migration[] = files
      .filter((f) => f.endsWith('.sql'))
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
        // Execute migration SQL
        db.run(migration.sql);

        // Record migration
        const stmt = db.prepare(
          'INSERT INTO migrations (filename) VALUES (?)'
        );
        stmt.run([migration.filename]);
        stmt.free();

        console.log(`✅ ${migration.filename} applied successfully`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ Error applying ${migration.filename}:`, error);
        throw error;
      }
    }

    // Save database to file
    const data = db.export();
    fs.writeFileSync(DB_PATH, data);
    db.close();

    console.log(`\n✨ Migration complete!`);
    console.log(`📊 Applied ${appliedCount} new migration(s)`);
    console.log(`📁 Database: ${DB_PATH}\n`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});