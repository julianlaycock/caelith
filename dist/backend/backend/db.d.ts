/**
 * Database Connection - PostgreSQL
 *
 * Drop-in replacement for the SQLite db.ts.
 * Same API surface: query(), execute(), boolToInt(), intToBool(), parseJSON(), stringifyJSON()
 * Repositories require zero changes.
 */
import { Pool } from 'pg';
/**
 * Execute a query and return results
 */
export declare function query<T = unknown>(sql: string, params?: (string | number | boolean | null)[]): Promise<T[]>;
/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export declare function execute(sql: string, params?: (string | number | boolean | null)[]): Promise<void>;
/**
 * Helper: boolean → PostgreSQL compatible value
 * Previously converted to 0/1 for SQLite. Now passes through for PostgreSQL.
 */
export declare function boolToInt(value: boolean): boolean;
/**
 * Helper: PostgreSQL value → boolean
 * Handles both number (legacy) and boolean (PostgreSQL native)
 */
export declare function intToBool(value: number | boolean): boolean;
/**
 * Helper: Parse JSON from database
 * PostgreSQL JSONB returns objects directly; handles both string and object input.
 */
export declare function parseJSON<T>(value: string | T | null): T | null;
/**
 * Helper: Stringify JSON for database
 */
export declare function stringifyJSON(value: string[] | Record<string, unknown> | null): string;
/**
 * Get the pool (for migration scripts or direct access)
 */
export declare function getPool(): Pool;
export declare function closeDb(): void;
/**
 * Legacy compatibility - no-ops for PostgreSQL
 */
export declare function getDb(): Promise<Pool>;
export declare function saveDb(): void;
export declare function setTestDb(): void;
//# sourceMappingURL=db.d.ts.map