/**
 * Investor Document Repository — KYC Document Data Access
 */

import { randomUUID } from 'crypto';
import { execute, query, DEFAULT_TENANT_ID } from '../db.js';

export interface InvestorDocument {
  id: string;
  investor_id: string;
  document_type: string;
  filename: string;
  mime_type: string;
  file_size: number;
  status: string;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestorDocumentInput {
  investor_id: string;
  document_type: string;
  filename: string;
  mime_type: string;
  file_size: number;
  file_data: Buffer;
  expiry_date?: string;
  notes?: string;
  uploaded_by?: string;
}

export async function createInvestorDocument(
  input: CreateInvestorDocumentInput
): Promise<InvestorDocument> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO investor_documents
      (id, tenant_id, investor_id, document_type, filename, mime_type,
       file_size, file_data, expiry_date, notes, uploaded_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id, DEFAULT_TENANT_ID, input.investor_id,
      input.document_type, input.filename, input.mime_type,
      input.file_size, input.file_data as unknown as string,
      input.expiry_date || null, input.notes || null,
      input.uploaded_by || null, now, now,
    ]
  );

  return {
    id,
    investor_id: input.investor_id,
    document_type: input.document_type,
    filename: input.filename,
    mime_type: input.mime_type,
    file_size: input.file_size,
    status: 'uploaded',
    expiry_date: input.expiry_date || null,
    notes: input.notes || null,
    uploaded_by: input.uploaded_by || null,
    verified_by: null,
    verified_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function findDocumentsByInvestor(
  investorId: string
): Promise<InvestorDocument[]> {
  return query<InvestorDocument>(
    `SELECT id, investor_id, document_type, filename, mime_type, file_size,
            status, expiry_date, notes, uploaded_by, verified_by, verified_at,
            created_at, updated_at
     FROM investor_documents
     WHERE investor_id = $1
     ORDER BY created_at DESC`,
    [investorId]
  );
}

export async function findDocumentById(
  id: string
): Promise<(InvestorDocument & { file_data: Buffer }) | null> {
  const results = await query<InvestorDocument & { file_data: Buffer }>(
    `SELECT * FROM investor_documents WHERE id = $1`,
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

export async function updateDocumentStatus(
  id: string,
  status: string,
  verifiedBy?: string
): Promise<InvestorDocument | null> {
  const now = new Date().toISOString();
  const sets = ['status = $1', 'updated_at = $2'];
  const params: (string | null)[] = [status, now];

  if (status === 'verified' && verifiedBy) {
    sets.push(`verified_by = $${sets.length + 1}`);
    params.push(verifiedBy);
    sets.push(`verified_at = $${sets.length + 1}`);
    params.push(now);
  }

  params.push(id);
  await execute(
    `UPDATE investor_documents SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  );

  const results = await query<InvestorDocument>(
    `SELECT id, investor_id, document_type, filename, mime_type, file_size,
            status, expiry_date, notes, uploaded_by, verified_by, verified_at,
            created_at, updated_at
     FROM investor_documents WHERE id = $1`,
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

export async function deleteDocument(id: string): Promise<void> {
  await execute('DELETE FROM investor_documents WHERE id = $1', [id]);
}
