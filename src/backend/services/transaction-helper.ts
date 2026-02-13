/**
 * Transaction Helper
 *
 * Encapsulates the BEGIN / COMMIT / ROLLBACK boilerplate for PostgreSQL
 * transactions using the shared connection pool.
 *
 * Usage:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('SELECT ... FOR UPDATE', [...]);
 *     await client.query('UPDATE ...', [...]);
 *     return someValue;
 *   });
 */

import { PoolClient } from 'pg';
import { getPool } from '../db.js';

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
