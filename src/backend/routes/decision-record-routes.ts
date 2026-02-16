import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFound } from '../middleware/validate.js';
import {
  findDecisionRecordById,
  findDecisionsByAsset,
  findDecisionsBySubject,
} from '../repositories/decision-record-repository.js';
import { explainDecision } from '../services/decision-explain-service.js';
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

router.get('/', asyncHandler(async (req, res) => {
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

  const parse = <T>(val: unknown): T => (typeof val === 'string' ? JSON.parse(val) : val ?? {}) as T;
  const decisions = rows.map((row) => ({
    id: row.id,
    decision_type: row.decision_type,
    asset_id: row.asset_id ?? null,
    asset_name: row.asset_name ?? null,
    subject_id: row.subject_id,
    input_snapshot: parse<Record<string, unknown>>(row.input_snapshot),
    rule_version_snapshot: parse<Record<string, unknown>>(row.rule_version_snapshot),
    result: row.result,
    result_details: parse<Record<string, unknown>>(row.result_details),
    decided_by: row.decided_by ?? null,
    decided_by_name: row.decided_by_name ?? null,
    decided_by_email: row.decided_by_email ?? null,
    decided_at: String(row.decided_at),
    created_at: String(row.created_at),
    sequence_number: row.sequence_number,
    integrity_hash: row.integrity_hash ?? null,
    previous_hash: row.previous_hash ?? null,
  }));

  res.json({ decisions, total, limit, offset });
}));

router.get('/verify-chain', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  const result = await verifyChain(limit);
  res.json(result);
}));

router.post('/seal-all', authorize('admin'), asyncHandler(async (_req, res) => {
  const count = await sealAllUnsealed();
  res.json({ sealed: count, message: `Sealed ${count} previously unsealed records.` });
}));

router.get('/asset/:assetId', asyncHandler(async (req, res) => {
  const records = await findDecisionsByAsset(req.params.assetId);
  res.json(records);
}));

router.get('/investor/:investorId', asyncHandler(async (req, res) => {
  const records = await findDecisionsBySubject(req.params.investorId);
  res.json(records);
}));

router.get('/:id/explain', asyncHandler(async (req, res) => {
  const explanation = await explainDecision(req.params.id);
  res.json(explanation);
}));

router.get('/:id/evidence.pdf', asyncHandler(async (req, res) => {
  const record = await findDecisionRecordById(req.params.id);
  requireFound(record, 'Decision record', req.params.id);
  const decision = record!;

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const filename = `decision-evidence-${decision.id.substring(0, 8)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageBottom = 790;
  const left = 48;
  const width = 499;
  let y = 48;

  const ensureSpace = (height: number): void => {
    if (y + height > pageBottom) {
      doc.addPage();
      y = 48;
    }
  };

  const writeLabelValue = (label: string, value: string): void => {
    ensureSpace(26);
    doc.fontSize(8).fillColor('#6E655D').text(label.toUpperCase(), left, y);
    y += 11;
    doc.fontSize(10).fillColor('#2D2722').text(value, left, y, { width });
    y += 16;
  };

  const writeJsonBlock = (label: string, data: unknown): void => {
    const serialized = JSON.stringify(data ?? {}, null, 2);
    const chunks = serialized.match(/.{1,900}/gs) ?? ['{}'];
    ensureSpace(20);
    doc.fontSize(8).fillColor('#6E655D').text(label.toUpperCase(), left, y);
    y += 12;
    for (const chunk of chunks) {
      const textHeight = doc.heightOfString(chunk, { width: width - 14 });
      ensureSpace(textHeight + 16);
      doc.roundedRect(left, y, width, textHeight + 10, 4).fill('#F2EFE0');
      doc.fontSize(8).fillColor('#2D2722').text(chunk, left + 7, y + 5, { width: width - 14 });
      y += textHeight + 16;
    }
  };

  doc.rect(0, 0, doc.page.width, 58).fill('#24364A');
  doc.fontSize(11).fillColor('#E3DDD9').text('CAELITH DECISION EVIDENCE BUNDLE', left, 20, {
    width,
    characterSpacing: 1,
  });
  doc.fontSize(8).fillColor('#D8BA8E').text(new Date().toISOString(), left, 36, { width });
  y = 74;

  writeLabelValue('Decision ID', decision.id);
  writeLabelValue('Decision Type', decision.decision_type);
  writeLabelValue('Result', decision.result);
  writeLabelValue('Asset ID', decision.asset_id || '-');
  writeLabelValue('Subject ID', decision.subject_id);
  writeLabelValue('Decided At', decision.decided_at);
  writeLabelValue('Integrity Hash', decision.integrity_hash || '-');
  writeLabelValue('Previous Hash', decision.previous_hash || '-');

  const checks = decision.result_details?.checks ?? [];
  ensureSpace(20);
  doc.fontSize(8).fillColor('#6E655D').text('CHECK OUTCOMES', left, y);
  y += 12;
  if (checks.length === 0) {
    doc.fontSize(9).fillColor('#5A524B').text('No checks captured for this decision.', left, y, { width });
    y += 16;
  } else {
    for (const check of checks) {
      ensureSpace(22);
      doc.fontSize(9).fillColor(check.passed ? '#3D6658' : '#8A4A45').text(check.passed ? 'PASS' : 'FAIL', left, y);
      doc.fontSize(9).fillColor('#2D2722').text(`${check.rule}: ${check.message}`, left + 40, y, { width: width - 40 });
      y += doc.heightOfString(`${check.rule}: ${check.message}`, { width: width - 40 }) + 6;
    }
  }

  writeJsonBlock('Input Snapshot', decision.input_snapshot);
  writeJsonBlock('Rule Snapshot', decision.rule_version_snapshot);

  doc.end();
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const record = await findDecisionRecordById(req.params.id);
  requireFound(record, 'Decision record', req.params.id);
  res.json(record);
}));

export default router;
