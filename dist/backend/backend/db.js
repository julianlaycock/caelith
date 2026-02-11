/**
 * Database Connection - PostgreSQL
 *
 * Drop-in replacement for the SQLite db.ts.
 * Same API surface: query(), execute(), parseJSON(), stringifyJSON()
 * Repositories require zero changes.
 */
import { Pool, types } from 'pg';
// PostgreSQL BIGINT (OID 20) and NUMERIC (OID 1700) are returned as strings.
// Parse as Number since our values are within safe integer range.
types.setTypeParser(20, (val) => parseInt(val, 10));
types.setTypeParser(1700, (val) => parseFloat(val));
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://caelith:caelith@localhost:5432/caelith',
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
function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}
/**
 * Execute a query and return results
 */
export async function query(sql, params = []) {
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows;
}
/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export async function execute(sql, params = []) {
    await pool.query(convertPlaceholders(sql), params);
}
/**
 * Helper: Parse JSON from database
 * PostgreSQL JSONB returns objects directly; handles both string and object input.
 */
export function parseJSON(value) {
    if (value === null)
        return null;
    if (typeof value === 'object')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
/**
 * Helper: Stringify JSON for database
 */
export function stringifyJSON(value) {
    return JSON.stringify(value);
}
/**
 * Get the pool (for migration scripts or direct access)
 */
export function getPool() {
    return pool;
}
/**
 * Close database connection
 */
let poolEnded = false;
export async function closeDb() {
    if (!poolEnded) {
        poolEnded = true;
        await pool.end();
    }
}
//# sourceMappingURL=db.js.map