import { query, execute, DEFAULT_TENANT_ID } from '../db.js';

export interface FundLmt {
  id: string;
  tenant_id: string;
  fund_structure_id: string;
  lmt_type: string;
  activation_threshold: string | null;
  activation_policy: string | null;
  status: string;
  last_activated_at: string | null;
  last_deactivated_at: string | null;
  nca_notified: boolean;
  nca_notified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLmtsByFund(fundId: string): Promise<FundLmt[]> {
  return query<FundLmt>(
    `SELECT * FROM fund_lmts WHERE fund_structure_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
    [fundId, DEFAULT_TENANT_ID]
  );
}

export async function createLmt(fundId: string, data: Partial<FundLmt>): Promise<FundLmt> {
  const rows = await query<FundLmt>(
    `INSERT INTO fund_lmts (tenant_id, fund_structure_id, lmt_type, activation_threshold, activation_policy, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [DEFAULT_TENANT_ID, fundId, data.lmt_type || '', data.activation_threshold || null, data.activation_policy || null, data.status || 'configured', data.notes || null]
  );
  return rows[0];
}

export async function updateLmt(id: string, data: Partial<FundLmt>): Promise<FundLmt | null> {
  const rows = await query<FundLmt>(
    `UPDATE fund_lmts SET lmt_type = COALESCE($1, lmt_type), activation_threshold = COALESCE($2, activation_threshold),
     activation_policy = COALESCE($3, activation_policy), notes = COALESCE($4, notes), updated_at = NOW()
     WHERE id = $5 AND tenant_id = $6 RETURNING *`,
    [data.lmt_type || null, data.activation_threshold || null, data.activation_policy || null, data.notes || null, id, DEFAULT_TENANT_ID]
  );
  return rows[0] || null;
}

export async function deleteLmt(id: string): Promise<boolean> {
  const existing = await query('SELECT 1 FROM fund_lmts WHERE id = $1 AND tenant_id = $2', [id, DEFAULT_TENANT_ID]);
  if (existing.length === 0) return false;
  await execute(
    `DELETE FROM fund_lmts WHERE id = $1 AND tenant_id = $2`,
    [id, DEFAULT_TENANT_ID]
  );
  return true;
}

export async function activateLmt(id: string): Promise<FundLmt | null> {
  const rows = await query<FundLmt>(
    `UPDATE fund_lmts SET status = 'active', last_activated_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, DEFAULT_TENANT_ID]
  );
  return rows[0] || null;
}

export async function deactivateLmt(id: string): Promise<FundLmt | null> {
  const rows = await query<FundLmt>(
    `UPDATE fund_lmts SET status = 'configured', last_deactivated_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, DEFAULT_TENANT_ID]
  );
  return rows[0] || null;
}
