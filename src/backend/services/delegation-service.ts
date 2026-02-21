import { query, execute, DEFAULT_TENANT_ID } from '../db.js';

export interface FundDelegation {
  id: string;
  tenant_id: string;
  fund_structure_id: string;
  delegate_name: string;
  delegate_lei: string | null;
  function_delegated: string;
  jurisdiction: string | null;
  start_date: string | null;
  oversight_frequency: string | null;
  last_review_date: string | null;
  next_review_date: string | null;
  status: string;
  letterbox_risk: string;
  termination_clause: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDelegationsByFund(fundId: string): Promise<FundDelegation[]> {
  return query<FundDelegation>(
    `SELECT * FROM fund_delegations WHERE fund_structure_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
    [fundId, DEFAULT_TENANT_ID]
  );
}

export async function createDelegation(fundId: string, data: Partial<FundDelegation>): Promise<FundDelegation> {
  const rows = await query<FundDelegation>(
    `INSERT INTO fund_delegations (tenant_id, fund_structure_id, delegate_name, delegate_lei, function_delegated, jurisdiction, start_date, oversight_frequency, last_review_date, next_review_date, status, letterbox_risk, termination_clause, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [DEFAULT_TENANT_ID, fundId, data.delegate_name || '', data.delegate_lei || null, data.function_delegated || '', data.jurisdiction || null, data.start_date || null, data.oversight_frequency || null, data.last_review_date || null, data.next_review_date || null, data.status || 'active', data.letterbox_risk || 'low', data.termination_clause || null, data.notes || null]
  );
  return rows[0];
}

export async function updateDelegation(id: string, data: Partial<FundDelegation>): Promise<FundDelegation | null> {
  const rows = await query<FundDelegation>(
    `UPDATE fund_delegations SET
     delegate_name = COALESCE($1, delegate_name), delegate_lei = COALESCE($2, delegate_lei),
     function_delegated = COALESCE($3, function_delegated), jurisdiction = COALESCE($4, jurisdiction),
     start_date = COALESCE($5, start_date), oversight_frequency = COALESCE($6, oversight_frequency),
     last_review_date = COALESCE($7, last_review_date), next_review_date = COALESCE($8, next_review_date),
     status = COALESCE($9, status), letterbox_risk = COALESCE($10, letterbox_risk),
     termination_clause = COALESCE($11, termination_clause), notes = COALESCE($12, notes),
     updated_at = NOW()
     WHERE id = $13 AND tenant_id = $14 RETURNING *`,
    [data.delegate_name || null, data.delegate_lei || null, data.function_delegated || null, data.jurisdiction || null, data.start_date || null, data.oversight_frequency || null, data.last_review_date || null, data.next_review_date || null, data.status || null, data.letterbox_risk || null, data.termination_clause || null, data.notes || null, id, DEFAULT_TENANT_ID]
  );
  return rows[0] || null;
}

export async function deleteDelegation(id: string): Promise<boolean> {
  const existing = await query('SELECT 1 FROM fund_delegations WHERE id = $1 AND tenant_id = $2', [id, DEFAULT_TENANT_ID]);
  if (existing.length === 0) return false;
  await execute(
    `DELETE FROM fund_delegations WHERE id = $1 AND tenant_id = $2`,
    [id, DEFAULT_TENANT_ID]
  );
  return true;
}
