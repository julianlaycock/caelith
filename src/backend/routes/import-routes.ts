/**
 * Import Routes
 *
 * POST /api/import/bulk        — JSON bulk import (existing)
 * POST /api/import/parse-csv   — Parse CSV, return columns + preview + auto-mapping
 * POST /api/import/csv         — Import from CSV with column mapping
 * GET  /api/import/templates/:entityType — Download CSV template
 */

import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../errors.js';
import { executeBulkImport, BulkImportPayload } from '../services/import-service.js';
import {
  parseCsvPreview,
  csvToPayload,
  CSV_TEMPLATES,
  ImportEntityType,
} from '../services/csv-import-service.js';

const router = Router();

// Multer config: memory storage (no disk writes), 5MB limit, CSV-only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

const VALID_ENTITY_TYPES: ImportEntityType[] = ['investors', 'fund_structures', 'holdings', 'eligibility_criteria'];

function validateEntityType(value: string): ImportEntityType {
  if (!VALID_ENTITY_TYPES.includes(value as ImportEntityType)) {
    throw new ValidationError(`Invalid entityType '${value}'. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }
  return value as ImportEntityType;
}

// ── JSON Bulk Import ─────────────────────────────────────────────────────

router.post('/bulk', asyncHandler(async (req, res) => {
  const payload = req.body as BulkImportPayload;

  const hasEntities = (payload.fundStructures?.length ?? 0) > 0
    || (payload.investors?.length ?? 0) > 0
    || (payload.holdings?.length ?? 0) > 0
    || (payload.eligibilityCriteria?.length ?? 0) > 0;

  if (!hasEntities) {
    throw new ValidationError('Import payload must contain at least one entity (fundStructures, investors, holdings, or eligibilityCriteria)');
  }

  const totalEntities = (payload.fundStructures?.length ?? 0)
    + (payload.investors?.length ?? 0)
    + (payload.holdings?.length ?? 0)
    + (payload.eligibilityCriteria?.length ?? 0);

  if (totalEntities > 5000) {
    throw new ValidationError(`Import payload too large: ${totalEntities} entities (max 5000). Split into smaller batches.`);
  }

  const result = await executeBulkImport(payload, req.user?.tenantId, req.user?.userId);
  res.status(201).json(result);
}));

// ── CSV Preview / Parse ──────────────────────────────────────────────────

router.post('/parse-csv', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded. Send a CSV file as multipart/form-data with field name "file".');
  }

  const entityType = validateEntityType(req.body.entityType || 'investors');
  const content = req.file.buffer.toString('utf-8');
  const result = parseCsvPreview(content, entityType);

  if (result.totalRows === 0) {
    throw new ValidationError('CSV file is empty or contains only headers.');
  }

  res.json(result);
}));

// ── CSV Import ───────────────────────────────────────────────────────────

router.post('/csv', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded. Send a CSV file as multipart/form-data with field name "file".');
  }

  const entityType = validateEntityType(req.body.entityType || 'investors');

  let columnMapping: Record<string, string>;
  try {
    columnMapping = JSON.parse(req.body.columnMapping || '{}');
  } catch {
    throw new ValidationError('columnMapping must be a valid JSON object mapping CSV columns to schema fields.');
  }

  if (Object.keys(columnMapping).length === 0) {
    throw new ValidationError('columnMapping is required. Map at least one CSV column to a schema field.');
  }

  const content = req.file.buffer.toString('utf-8');
  const mode = req.body.mode === 'best_effort' ? 'best_effort' : 'strict';
  const payload = csvToPayload(content, entityType, columnMapping, mode);

  const totalEntities = (payload.fundStructures?.length ?? 0)
    + (payload.investors?.length ?? 0)
    + (payload.holdings?.length ?? 0)
    + (payload.eligibilityCriteria?.length ?? 0);

  if (totalEntities === 0) {
    throw new ValidationError('CSV file produced no valid entities after applying column mapping.');
  }

  if (totalEntities > 5000) {
    throw new ValidationError(`CSV contains ${totalEntities} rows (max 5000). Split into smaller files.`);
  }

  try {
    const result = await executeBulkImport(payload, req.user?.tenantId, req.user?.userId);
    res.status(201).json(result);
  } catch (importErr) {
    console.error('[import/csv] IMPORT FAILED:', importErr instanceof Error ? importErr.message : importErr);
    console.error('[import/csv] Stack:', importErr instanceof Error ? importErr.stack : 'no stack');
    throw importErr;
  }
}));

// ── CSV Template Downloads ───────────────────────────────────────────────

router.get('/templates/:entityType', (req, res) => {
  const entityType = req.params.entityType as string;
  if (!VALID_ENTITY_TYPES.includes(entityType as ImportEntityType)) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `Invalid entityType '${entityType}'. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
    });
    return;
  }

  const template = CSV_TEMPLATES[entityType as ImportEntityType];
  const filename = `caelith-${entityType}-template.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(template);
});

export default router;
