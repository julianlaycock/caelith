/**
 * Database Connection - PostgreSQL
 *
 * Drop-in replacement for the SQLite db.ts.
 * Same API surface: query(), execute(), parseJSON(), stringifyJSON()
 * Repositories require zero changes.
 */

import { Pool, types } from 'pg';

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000099';

// PostgreSQL BIGINT (OID 20) and NUMERIC (OID 1700) are returned as strings.
// Parse as Number since our values are within safe integer range.
types.setTypeParser(20, (val: string) => parseInt(val, 10));
types.setTypeParser(1700, (val: string) => parseFloat(val));

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://caelith:caelith@localhost:5432/caelith',
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Convert ? placeholders to $1, $2, etc. (SQLite → PostgreSQL compatibility)
 */
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * Helper to append tenant scoping to a SQL statement.
 * Adds `WHERE <tenantColumn> = ?` or `AND <tenantColumn> = ?` as needed.
 */
export function withTenant(
  sql: string,
  tenantId?: string,
  tenantColumn = 'tenant_id'
): { sql: string; params: [string] } {
  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;
  const hasWhere = /\bwhere\b/i.test(sql);
  const scopedSql = hasWhere
    ? `${sql} AND ${tenantColumn} = ?`
    : `${sql} WHERE ${tenantColumn} = ?`;
  return { sql: scopedSql, params: [scopedTenantId] };
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

export async function closeDb(): Promise<void> {
  if (!poolEnded) {
    poolEnded = true;
    await pool.end();
  }
}
