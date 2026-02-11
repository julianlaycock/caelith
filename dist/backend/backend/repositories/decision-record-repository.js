import { randomUUID } from 'crypto';
import { query } from '../db.js';
export async function createDecisionRecord(input) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const result = await query(`INSERT INTO decision_records
       (id, decision_type, asset_id, subject_id, input_snapshot,
        rule_version_snapshot, result, result_details, decided_by, decided_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [
        id, input.decision_type, input.asset_id ?? null, input.subject_id,
        JSON.stringify(input.input_snapshot), JSON.stringify(input.rule_version_snapshot),
        input.result, JSON.stringify(input.result_details),
        input.decided_by ?? null, now, now,
    ]);
    return rowToDecisionRecord(result[0]);
}
export async function findDecisionRecordById(id) {
    const result = await query('SELECT * FROM decision_records WHERE id = $1', [id]);
    return result[0] ? rowToDecisionRecord(result[0]) : null;
}
export async function findDecisionsByAsset(assetId) {
    const result = await query('SELECT * FROM decision_records WHERE asset_id = $1 ORDER BY decided_at DESC', [assetId]);
    return result.map(rowToDecisionRecord);
}
export async function findDecisionsBySubject(subjectId) {
    const result = await query('SELECT * FROM decision_records WHERE subject_id = $1 ORDER BY decided_at DESC', [subjectId]);
    return result.map(rowToDecisionRecord);
}
function rowToDecisionRecord(row) {
    const parse = (val) => typeof val === 'string' ? JSON.parse(val) : val ?? {};
    return {
        id: row.id,
        decision_type: row.decision_type,
        asset_id: row.asset_id ?? null,
        subject_id: row.subject_id,
        input_snapshot: parse(row.input_snapshot),
        rule_version_snapshot: parse(row.rule_version_snapshot),
        result: row.result,
        result_details: parse(row.result_details),
        decided_by: row.decided_by ?? null,
        decided_at: String(row.decided_at),
        created_at: String(row.created_at),
    };
}
//# sourceMappingURL=decision-record-repository.js.map