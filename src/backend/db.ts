/**
 * Database Connection - PostgreSQL
 *
 * Drop-in replacement for the SQLite db.ts.
 * Same API surface: query(), execute(), parseJSON(), stringifyJSON()
 * Repositories require zero changes.
 *
 * Tenant-scoped functions (queryWithTenant, executeWithTenant) set the
 * PostgreSQL session variable `app.tenant_id` within a transaction so
 * Row-Level Security policies enforce isolation at the database level.
 */

import { Pool, PoolClient, types } from 'pg';
import { logger } from './lib/logger.js';

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000099';

// PostgreSQL BIGINT (OID 20) and NUMERIC (OID 1700) are returned as strings.
// Parse as Number since our values are within safe integer range.
types.setTypeParser(20, (val: string) => parseInt(val, 10));
types.setTypeParser(1700, (val: string) => parseFloat(val));

// SSL config: Railway internal Postgres uses self-signed certs
const sslConfig = process.env.NODE_ENV === 'production'
  ? { ssl: { rejectUnauthorized: false } }
  : {};

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://caelith:caelith@localhost:5432/caelith',
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...sslConfig,
});

pool.on('error', (err) => {
  logger.error('Unexpected pool error', { error: err });
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
 * Inserts the clause before ORDER BY / GROUP BY / HAVING / LIMIT if present.
 */
export function withTenant(
  sql: string,
  tenantId?: string,
  tenantColumn = 'tenant_id'
): { sql: string; params: [string]; insertAt: number } {
  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;
  const hasWhere = /\bwhere\b/i.test(sql);
  const connector = hasWhere ? 'AND' : 'WHERE';
  const tenantClause = `${connector} ${tenantColumn} = ?`;

  // Find the first trailing clause that must come after WHERE/AND
  const trailingMatch = sql.match(
    /\b(ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT)\b/i
  );

  let scopedSql: string;
  let insertAt: number;
  if (trailingMatch && trailingMatch.index !== undefined) {
    const pos = trailingMatch.index;
    // Count ? placeholders before the insertion point so we can splice
    // the tenant param at the correct position in the params array
    insertAt = (sql.slice(0, pos).match(/\?/g) || []).length;
    scopedSql = `${sql.slice(0, pos)}${tenantClause} ${sql.slice(pos)}`;
  } else {
    insertAt = (sql.match(/\?/g) || []).length;
    scopedSql = `${sql} ${tenantClause}`;
  }

  return { sql: scopedSql, params: [scopedTenantId], insertAt };
}

/**
 * Execute a query and return results.
 * Note: For tenant-scoped tables with FORCE ROW LEVEL SECURITY,
 * use queryWithTenant() instead to set the RLS session variable.
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
 * Run a callback within a transaction with the RLS tenant context set.
 * Uses SET LOCAL so the session variable is scoped to the transaction
 * and automatically reset on COMMIT/ROLLBACK — safe for connection pools.
 */
async function withTenantContext<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.tenant_id = $1', [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Tenant-scoped query — automatically appends WHERE/AND tenant_id = ? filtering
 * AND sets the RLS session variable within a transaction for database-level isolation.
 */
export async function queryWithTenant<T = unknown>(
  sql: string,
  params: (string | number | boolean | null)[] = [],
  tenantId?: string
): Promise<T[]> {
  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;
  const { sql: scopedSql, params: tenantParams, insertAt } = withTenant(sql, scopedTenantId);
  const allParams = [...params];
  allParams.splice(insertAt, 0, ...tenantParams);
  const converted = convertPlaceholders(scopedSql);

  return withTenantContext(scopedTenantId, async (client) => {
    const result = await client.query(converted, allParams);
    return result.rows as T[];
  });
}

/**
 * Tenant-scoped execute — automatically appends WHERE/AND tenant_id = ? filtering
 * AND sets the RLS session variable within a transaction for database-level isolation.
 */
export async function executeWithTenant(
  sql: string,
  params: (string | number | boolean | null)[] = [],
  tenantId?: string
): Promise<void> {
  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;
  const { sql: scopedSql, params: tenantParams, insertAt } = withTenant(sql, scopedTenantId);
  const allParams = [...params];
  allParams.splice(insertAt, 0, ...tenantParams);
  const converted = convertPlaceholders(scopedSql);

  await withTenantContext(scopedTenantId, async (client) => {
    await client.query(converted, allParams);
  });
}

/**
 * Execute a raw query within the RLS tenant context.
 * Use this for queries that already include manual tenant_id filtering
 * but need the session variable set for Row-Level Security enforcement.
 */
export async function queryInTenantContext<T = unknown>(
  sql: string,
  params: (string | number | boolean | null)[] = [],
  tenantId?: string
): Promise<T[]> {
  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;
  const converted = convertPlaceholders(sql);

  return withTenantContext(scopedTenantId, async (client) => {
    const result = await client.query(converted, params);
    return result.rows as T[];
  });
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
