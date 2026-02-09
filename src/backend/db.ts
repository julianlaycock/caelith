/**
 * Database Connection - PostgreSQL
 *
 * Drop-in replacement for the SQLite db.ts.
 * Same API surface: query(), execute(), boolToInt(), intToBool(), parseJSON(), stringifyJSON()
 * Repositories require zero changes.
 */

import { Pool, types } from 'pg';

// PostgreSQL BIGINT (OID 20) and NUMERIC (OID 1700) are returned as strings.
// Parse as Number since our values are within safe integer range.
types.setTypeParser(20, (val: string) => parseInt(val, 10));
types.setTypeParser(1700, (val: string) => parseFloat(val));

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://codex:codex@localhost:5432/codex',
});

/**
 * Convert ? placeholders to $1, $2, etc. (SQLite → PostgreSQL compatibility)
 */
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * Execute a query and return results
 */
export async function query<T = unknown>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  const result = await pool.query(convertPlaceholders(sql), params);
  return result.rows as T[];
}

/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<void> {
  await pool.query(convertPlaceholders(sql), params);
}

/**
 * Helper: boolean → PostgreSQL compatible value
 * Previously converted to 0/1 for SQLite. Now passes through for PostgreSQL.
 */
export function boolToInt(value: boolean): boolean {
  return value;
}

/**
 * Helper: PostgreSQL value → boolean
 * Handles both number (legacy) and boolean (PostgreSQL native)
 */
export function intToBool(value: number | boolean): boolean {
  return Boolean(value);
}

/**
 * Helper: Parse JSON from database
 * PostgreSQL JSONB returns objects directly; handles both string and object input.
 */
export function parseJSON<T>(value: string | T | null): T | null {
  if (value === null) return null;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return null;
  }
}

/**
 * Helper: Stringify JSON for database
 */
export function stringifyJSON(
  value: string[] | Record<string, unknown> | null
): string {
  return JSON.stringify(value);
}

/**
 * Get the pool (for migration scripts or direct access)
 */
export function getPool(): Pool {
  return pool;
}

/**
 * Close database connection
 */
let poolEnded = false;

export function closeDb(): void {
  if (!poolEnded) {
    poolEnded = true;
    pool.end();
  }
}

/**
 * Legacy compatibility - no-ops for PostgreSQL
 */
export async function getDb(): Promise<Pool> {
  return pool;
}
export function saveDb(): void {
  /* no-op: PostgreSQL persists automatically */
}
export function setTestDb(): void {
  /* no-op: use DATABASE_URL env var for test databases */
}