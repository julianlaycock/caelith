import { randomUUID } from 'crypto';
import { query } from '../db.js';
import {
  DecisionRecord,
  CreateDecisionRecordInput,
  DecisionType,
  DecisionResult,
  DecisionResultDetails,
} from '../models/index.js';
import { sealRecord } from '../services/integrity-service.js';

interface DecisionRecordRow {
  id: string;
  decision_type: string;
  asset_id: string | null;
  subject_id: string;
  input_snapshot: unknown;
  rule_version_snapshot: unknown;
  result: string;
  result_details: unknown;
  decided_by: string | null;
  decided_at: string | Date;
  created_at: string | Date;
  sequence_number?: number;
  integrity_hash?: string | null;
  previous_hash?: string | null;
}

export async function createDecisionRecord(input: CreateDecisionRecordInput): Promise<DecisionRecord> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await query<DecisionRecordRow>(
    `INSERT INTO decision_records
       (id, decision_type, asset_id, subject_id, input_snapshot,
        rule_version_snapshot, result, result_details, decided_by, decided_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, input.decision_type, input.asset_id ?? null, input.subject_id,
      JSON.stringify(input.input_snapshot), JSON.stringify(input.rule_version_snapshot),
      input.result, JSON.stringify(input.result_details),
      input.decided_by ?? null, now, now,
    ]
  );

  await sealRecord(id);
  const sealedRows = await query<DecisionRecordRow>(
    'SELECT * FROM decision_records WHERE id = $1',
    [id]
  );

  return rowToDecisionRecord(sealedRows[0] || result[0]);
}

export async function findDecisionRecordById(id: string): Promise<DecisionRecord | null> {
  const result = await query<DecisionRecordRow>('SELECT * FROM decision_records WHERE id = $1', [id]);
  return result[0] ? rowToDecisionRecord(result[0]) : null;
}

export async function findDecisionsByAsset(assetId: string): Promise<DecisionRecord[]> {
  const result = await query<DecisionRecordRow>(
    'SELECT * FROM decision_records WHERE asset_id = $1 ORDER BY decided_at DESC',
    [assetId]
  );
  return result.map(rowToDecisionRecord);
}

export async function findDecisionsBySubject(subjectId: string): Promise<DecisionRecord[]> {
  const result = await query<DecisionRecordRow>(
    'SELECT * FROM decision_records WHERE subject_id = $1 ORDER BY decided_at DESC',
    [subjectId]
  );
  return result.map(rowToDecisionRecord);
}

function rowToDecisionRecord(row: DecisionRecordRow): DecisionRecord {
  const parse = <T>(val: unknown): T =>
    (typeof val === 'string' ? JSON.parse(val) : val) as T;

  return {
    id: row.id,
    decision_type: row.decision_type as DecisionType,
    asset_id: row.asset_id ?? null,
    subject_id: row.subject_id,
    input_snapshot: parse<Record<string, unknown>>(row.input_snapshot),
    rule_version_snapshot: parse<Record<string, unknown>>(row.rule_version_snapshot),
    result: row.result as DecisionResult,
    result_details: parse<DecisionResultDetails>(row.result_details),
    decided_by: row.decided_by ?? null,
    decided_at: String(row.decided_at),
    created_at: String(row.created_at),
    sequence_number: row.sequence_number,
    integrity_hash: row.integrity_hash ?? null,
    previous_hash: row.previous_hash ?? null,
  };
}
