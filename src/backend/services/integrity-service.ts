/**
 * Integrity Service — server-side hash chain for decision records.
 *
 * Each sealed decision record stores:
 * - integrity_hash: SHA-256 hash of immutable fields + previous hash
 * - previous_hash: hash of prior record in sequence
 */

import { createHash } from 'crypto';
import { query, execute } from '../db.js';
import { NotFoundError } from '../errors.js';

const GENESIS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

interface DecisionRecordForHash {
  id: string;
  decision_type: string;
  subject_id: string | null;
  asset_id: string | null;
  input_snapshot: unknown;
  rule_version_snapshot: unknown;
  result: string;
  result_details: unknown;
  decided_at: string;
  decided_by: string | null;
}

interface DecisionRecordWithChain extends DecisionRecordForHash {
  sequence_number: number;
  integrity_hash: string | null;
  previous_hash: string | null;
}

export function computeRecordHash(
  record: DecisionRecordForHash,
  previousHash: string
): string {
  const canonical = JSON.stringify({
    id: record.id,
    decision_type: record.decision_type,
    subject_id: record.subject_id,
    asset_id: record.asset_id,
    input_snapshot: record.input_snapshot,
    rule_version_snapshot: record.rule_version_snapshot,
    result: record.result,
    result_details: record.result_details,
    decided_at: record.decided_at,
    decided_by: record.decided_by,
    previous_hash: previousHash,
  });

  return createHash('sha256').update(canonical).digest('hex');
}

export async function sealRecord(recordId: string): Promise<string> {
  const rows = await query<DecisionRecordWithChain>(
    `SELECT id, decision_type, subject_id, asset_id, input_snapshot,
            rule_version_snapshot, result, result_details, decided_at,
            decided_by, sequence_number, integrity_hash, previous_hash
     FROM decision_records
     WHERE id = $1`,
    [recordId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('Decision record', recordId);
  }

  const record = rows[0];

  const prevRows = await query<{ integrity_hash: string }>(
    `SELECT integrity_hash
     FROM decision_records
     WHERE sequence_number < $1 AND integrity_hash IS NOT NULL
     ORDER BY sequence_number DESC
     LIMIT 1`,
    [record.sequence_number]
  );

  const previousHash =
    prevRows.length > 0 ? prevRows[0].integrity_hash : GENESIS_HASH;

  const hash = computeRecordHash(record, previousHash);

  await execute(
    `UPDATE decision_records
     SET integrity_hash = $1, previous_hash = $2
     WHERE id = $3`,
    [hash, previousHash, recordId]
  );

  return hash;
}

export async function verifyChain(limit?: number): Promise<{
  valid: boolean;
  total_verified: number;
  broken_at_sequence?: number;
  broken_at_id?: string;
  expected_hash?: string;
  actual_hash?: string;
  message: string;
}> {
  const safeLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : null;
  const limitClause = safeLimit ? `LIMIT ${safeLimit}` : '';

  const records = await query<DecisionRecordWithChain>(
    `SELECT id, decision_type, subject_id, asset_id, input_snapshot,
            rule_version_snapshot, result, result_details, decided_at,
            decided_by, sequence_number, integrity_hash, previous_hash
     FROM decision_records
     WHERE integrity_hash IS NOT NULL
     ORDER BY sequence_number ASC
     ${limitClause}`
  );

  if (records.length === 0) {
    return {
      valid: true,
      total_verified: 0,
      message: 'No sealed records to verify.',
    };
  }

  let previousHash = GENESIS_HASH;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (record.previous_hash !== previousHash) {
      return {
        valid: false,
        total_verified: i,
        broken_at_sequence: record.sequence_number,
        broken_at_id: record.id,
        expected_hash: previousHash,
        actual_hash: record.previous_hash || 'null',
        message: `Chain broken at sequence ${record.sequence_number}: previous_hash mismatch.`,
      };
    }

    const expectedHash = computeRecordHash(record, previousHash);
    if (record.integrity_hash !== expectedHash) {
      return {
        valid: false,
        total_verified: i,
        broken_at_sequence: record.sequence_number,
        broken_at_id: record.id,
        expected_hash: expectedHash,
        actual_hash: record.integrity_hash || 'null',
        message: `Chain broken at sequence ${record.sequence_number}: integrity_hash mismatch.`,
      };
    }

    previousHash = record.integrity_hash;
  }

  return {
    valid: true,
    total_verified: records.length,
    message: `Chain verified: ${records.length} records, all hashes valid.`,
  };
}

export async function sealAllUnsealed(): Promise<number> {
  const unsealed = await query<{ id: string }>(
    `SELECT id
     FROM decision_records
     WHERE integrity_hash IS NULL
     ORDER BY sequence_number ASC`
  );

  for (const record of unsealed) {
    await sealRecord(record.id);
  }

  return unsealed.length;
}

export { GENESIS_HASH };
