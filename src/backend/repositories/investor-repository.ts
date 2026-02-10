import { randomUUID } from 'crypto';
import { query, execute, boolToInt, intToBool } from '../db.js';
import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';

/**
 * Investor Repository - Handles all database operations for investors
 */

/** Raw row shape returned by SQLite (booleans stored as 0/1 integers) */
interface InvestorRow {
  id: string;
  name: string;
  jurisdiction: string;
  accredited: number;
  investor_type: string;
  kyc_status: string;
  kyc_expiry: string | null;
  tax_id: string | null;
  lei: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

/** Map a DB row to the domain Investor model */
function rowToInvestor(row: InvestorRow): Investor {
  return {
    id: row.id,
    name: row.name,
    jurisdiction: row.jurisdiction,
    accredited: intToBool(row.accredited),
    investor_type: row.investor_type as Investor['investor_type'],
    kyc_status: row.kyc_status as Investor['kyc_status'],
    kyc_expiry: row.kyc_expiry,
    tax_id: row.tax_id,
    lei: row.lei,
    email: row.email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create a new investor
 */
export async function createInvestor(input: CreateInvestorInput): Promise<Investor> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const accredited = input.accredited ?? false;
  const investor_type = input.investor_type ?? 'professional';
  const kyc_status = input.kyc_status ?? 'pending';
  const kyc_expiry = input.kyc_expiry ?? null;
  const tax_id = input.tax_id ?? null;
  const lei = input.lei ?? null;
  const email = input.email ?? null;

  await execute(
    `INSERT INTO investors (id, name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.jurisdiction, boolToInt(accredited), investor_type, kyc_status, kyc_expiry, tax_id, lei, email, now, now]
  );

  const investor: Investor = {
    id,
    name: input.name,
    jurisdiction: input.jurisdiction,
    accredited,
    investor_type,
    kyc_status,
    kyc_expiry,
    tax_id,
    lei,
    email,
    created_at: now,
    updated_at: now,
  };

  return investor;
}

/**
 * Find investor by ID
 */
export async function findInvestorById(id: string): Promise<Investor | null> {
  const results = await query<InvestorRow>(
    'SELECT * FROM investors WHERE id = ?',
    [id]
  );

  if (results.length === 0) {
    return null;
  }

  return rowToInvestor(results[0]);
}

/**
 * Find all investors
 */
export async function findAllInvestors(): Promise<Investor[]> {
  const results = await query<InvestorRow>(
    'SELECT * FROM investors ORDER BY created_at DESC'
  );

  return results.map(rowToInvestor);
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
  const params: (string | number | boolean | null)[] = [];

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

  if (input.investor_type !== undefined) {
    updates.push('investor_type = ?');
    params.push(input.investor_type);
  }

  if (input.kyc_status !== undefined) {
    updates.push('kyc_status = ?');
    params.push(input.kyc_status);
  }

  if (input.kyc_expiry !== undefined) {
    updates.push('kyc_expiry = ?');
    params.push(input.kyc_expiry);
  }

  if (input.tax_id !== undefined) {
    updates.push('tax_id = ?');
    params.push(input.tax_id);
  }

  if (input.lei !== undefined) {
    updates.push('lei = ?');
    params.push(input.lei);
  }

  if (input.email !== undefined) {
    updates.push('email = ?');
    params.push(input.email);
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
  const results = await query<InvestorRow>(
    'SELECT * FROM investors WHERE jurisdiction = ? ORDER BY created_at DESC',
    [jurisdiction]
  );

  return results.map(rowToInvestor);
}
