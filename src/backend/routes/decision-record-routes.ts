import { Router, Request, Response } from 'express';
import {
  findDecisionRecordById,
  findDecisionsByAsset,
  findDecisionsBySubject,
} from '../repositories/decision-record-repository.js';
import { query, DEFAULT_TENANT_ID } from '../db.js';
import { verifyChain, sealAllUnsealed } from '../services/integrity-service.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

interface DecisionListRow {
  id: string;
  decision_type: string;
  asset_id: string | null;
  asset_name: string | null;
  subject_id: string;
  input_snapshot: unknown;
  rule_version_snapshot: unknown;
  result: string;
  result_details: unknown;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_by_email: string | null;
  decided_at: string | Date;
  created_at: string | Date;
  sequence_number?: number;
  integrity_hash?: string | null;
  previous_hash?: string | null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { decision_type, result } = req.query;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;

    conditions.push(`dr.tenant_id = $${paramIndex++}`);
    params.push(tenantId);

    if (decision_type && typeof decision_type === 'string') {
      conditions.push(`dr.decision_type = $${paramIndex++}`);
      params.push(decision_type);
    }
    if (result && typeof result === 'string') {
      conditions.push(`dr.result = $${paramIndex++}`);
      params.push(result);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM decision_records dr ${whereClause}`,
      params
    );
    const total = countResult[0]?.count ?? 0;

    const rows = await query<DecisionListRow>(
      `SELECT dr.*, a.name AS asset_name, u.name AS decided_by_name, u.email AS decided_by_email
       FROM decision_records dr
       LEFT JOIN assets a ON a.id = dr.asset_id
       LEFT JOIN users u ON u.id = dr.decided_by
       ${whereClause}
       ORDER BY dr.decided_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const parse = (val: unknown) => typeof val === 'string' ? JSON.parse(val) : val ?? {};
    const decisions = rows.map((row) => ({
      id: row.id,
      decision_type: row.decision_type,
      asset_id: row.asset_id ?? null,
      asset_name: row.asset_name ?? null,
      subject_id: row.subject_id,
      input_snapshot: parse(row.input_snapshot),
      rule_version_snapshot: parse(row.rule_version_snapshot),
      result: row.result,
      result_details: parse(row.result_details),
      decided_by: row.decided_by ?? null,
      decided_by_name: row.decided_by_name ?? null,
      decided_by_email: row.decided_by_email ?? null,
      decided_at: String(row.decided_at),
      created_at: String(row.created_at),
      sequence_number: row.sequence_number,
      integrity_hash: row.integrity_hash ?? null,
      previous_hash: row.previous_hash ?? null,
    }));

    return res.json({ decisions, total, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.get('/verify-chain', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const result = await verifyChain(limit);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.post('/seal-all', authorize('admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await sealAllUnsealed();
    res.json({ sealed: count, message: `Sealed ${count} previously unsealed records.` });
  } catch (err: unknown) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.get('/asset/:assetId', async (req: Request, res: Response) => {
  try {
    const records = await findDecisionsByAsset(req.params.assetId);
    return res.json(records);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.get('/investor/:investorId', async (req: Request, res: Response) => {
  try {
    const records = await findDecisionsBySubject(req.params.investorId);
    return res.json(records);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await findDecisionRecordById(req.params.id);
    if (!record) return res.status(404).json({ error: 'NOT_FOUND', message: `Decision record not found: ${req.params.id}` });
    return res.json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

export default router;
