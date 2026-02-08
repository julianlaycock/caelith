import { randomUUID } from 'crypto';
import { query, execute, boolToInt, intToBool } from '../db.js';
import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';

/**
 * Investor Repository - Handles all database operations for investors
 */

/**
 * Create a new investor
 */
export async function createInvestor(input: CreateInvestorInput): Promise<Investor> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO investors (id, name, jurisdiction, accredited, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.jurisdiction, boolToInt(input.accredited), now, now]
  );

  const investor: Investor = {
    id,
    name: input.name,
    jurisdiction: input.jurisdiction,
    accredited: input.accredited,
    created_at: now,
    updated_at: now,
  };

  return investor;
}

/**
 * Find investor by ID
 */
export async function findInvestorById(id: string): Promise<Investor | null> {
  const results = await query<{
    id: string;
    name: string;
    jurisdiction: string;
    accredited: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM investors WHERE id = ?', [id]);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return {
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction,
    accredited: intToBool(row.accredited),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Find all investors
 */
export async function findAllInvestors(): Promise<Investor[]> {
  const results = await query<{
    id: string;
    name: string;
    jurisdiction: string;
    accredited: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM investors ORDER BY created_at DESC');

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction,
    accredited: intToBool(row.accredited),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Update investor
 */
export async function updateInvestor(
  id: string,
  input: UpdateInvestorInput
): Promise<Investor | null> {
  const existing = await findInvestorById(id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }

  if (input.jurisdiction !== undefined) {
    updates.push('jurisdiction = ?');
    params.push(input.jurisdiction);
  }

  if (input.accredited !== undefined) {
    updates.push('accredited = ?');
    params.push(boolToInt(input.accredited));
  }

  if (updates.length === 0) {
    return existing;
  }

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  params.push(now);

  params.push(id);

  await execute(
    `UPDATE investors SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return await findInvestorById(id);
}

/**
 * Check if investor exists
 */
export async function investorExists(id: string): Promise<boolean> {
  const results = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM investors WHERE id = ?',
    [id]
  );

  return results.length > 0 && results[0].count > 0;
}

/**
 * Find investors by jurisdiction
 */
export async function findInvestorsByJurisdiction(
  jurisdiction: string
): Promise<Investor[]> {
  const results = await query<{
    id: string;
    name: string;
    jurisdiction: string;
    accredited: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM investors WHERE jurisdiction = ? ORDER BY created_at DESC', [
    jurisdiction,
  ]);

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction,
    accredited: intToBool(row.accredited),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}