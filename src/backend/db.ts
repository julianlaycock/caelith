import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/registry.db');

let dbInstance: initSqlJs.Database | null = null;
let SQL: initSqlJs.SqlJsStatic | null = null;

/**
 * Initialize sql.js library
 */
async function initSQL(): Promise<initSqlJs.SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

/**
 * Get database connection (singleton pattern)
 */
export async function getDb(): Promise<initSqlJs.Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const sql = await initSQL();

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `Database not found at ${DB_PATH}. Run 'npm run migrate' first.`
    );
  }

  const buffer = fs.readFileSync(DB_PATH);
  dbInstance = new sql.Database(buffer);

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON');

  return dbInstance;
}

/**
 * Save database to disk
 */
export function saveDb(): void {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  const data = dbInstance.export();
  fs.writeFileSync(DB_PATH, data);
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (dbInstance) {
    saveDb();
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Set a custom database instance (for testing)
 */
export function setTestDb(db: initSqlJs.Database): void {
  dbInstance = db;
}

/**
 * Execute a query and return results
 */
export async function query<T = unknown>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const db = await getDb();
  const results = db.exec(sql, params);

  if (results.length === 0) {
    return [];
  }

  const result = results[0];
  const rows: T[] = [];

  for (const valueArray of result.values) {
    const row: Record<string, unknown> = {};
    result.columns.forEach((col, index) => {
      row[col] = valueArray[index];
    });
    rows.push(row as T);
  }

  return rows;
}

/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params: (string | number | null)[] = []
): Promise<void> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDb();
}

/**
 * Helper to convert boolean to SQLite integer
 */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Helper to convert SQLite integer to boolean
 */
export function intToBool(value: number): boolean {
  return value === 1;
}

/**
 * Helper to parse JSON string from SQLite
 */
export function parseJSON<T>(value: string | null): T | null {
  if (value === null) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Helper to stringify JSON for SQLite
 */
export function stringifyJSON(value: string[] | Record<string, unknown> | null): string {
  return JSON.stringify(value);
}