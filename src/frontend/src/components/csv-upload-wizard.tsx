'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { Card, Button, Badge, Alert } from './ui';
import { parseCsvFull } from '../lib/csv-parser';
import { FIELD_META } from '../lib/field-metadata';
import type { FieldMeta } from '../lib/field-metadata';
import type {
  ImportEntityType,
  CsvParseResult,
  BulkImportResult,
  BulkImportPayload,
  ImportRowError,
  ApiError,
} from '../lib/types';

type CsvStep = 'upload' | 'map' | 'preview' | 'importing' | 'complete';

const ENTITY_TYPE_LABELS: Record<ImportEntityType, string> = {
  investors: 'Investors',
  fund_structures: 'Fund Structures',
  holdings: 'Holdings',
  eligibility_criteria: 'Eligibility Criteria',
};

const SCHEMA_FIELDS: Record<ImportEntityType, { field: string; label: string; hint?: string; required: boolean }[]> = {
  investors: [
    { field: 'name', label: 'Name', hint: 'Company or person name', required: true },
    { field: 'jurisdiction', label: 'Jurisdiction', hint: 'DE, LU, IE, FR...', required: true },
    { field: 'investor_type', label: 'Investor Type', hint: 'institutional, professional, retail...', required: false },
    { field: 'accredited', label: 'Accredited', hint: 'true / false', required: false },
    { field: 'kyc_status', label: 'KYC Status', hint: 'pending, verified, expired, rejected', required: false },
    { field: 'kyc_expiry', label: 'KYC Expiry', hint: 'YYYY-MM-DD', required: false },
    { field: 'tax_id', label: 'Tax ID', hint: 'National tax identifier', required: false },
    { field: 'lei', label: 'LEI', hint: '20-char Legal Entity Identifier', required: false },
    { field: 'email', label: 'Email', required: false },
  ],
  fund_structures: [
    { field: 'name', label: 'Fund Name', hint: 'Full fund name', required: true },
    { field: 'legal_form', label: 'Legal Form', hint: 'SICAV, SIF, RAIF, SCSp, QIAIF...', required: true },
    { field: 'domicile', label: 'Domicile', hint: 'LU, DE, IE, FR...', required: true },
    { field: 'regulatory_framework', label: 'Framework', hint: 'AIFMD, UCITS, ELTIF, national', required: true },
    { field: 'aifm_name', label: 'AIFM Name', hint: 'Fund manager name', required: false },
    { field: 'currency', label: 'Currency', hint: 'EUR, USD, GBP...', required: false },
    { field: 'target_size', label: 'Target Size', hint: 'Target AUM in base currency', required: false },
    { field: 'total_units', label: 'Total Units', hint: 'Authorized share units', required: false },
    { field: 'status', label: 'Status', hint: 'active, closing, closed', required: false },
    { field: 'inception_date', label: 'Inception Date', hint: 'YYYY-MM-DD', required: false },
  ],
  holdings: [
    { field: 'investor_name', label: 'Investor Name', hint: 'Must match existing investor', required: false },
    { field: 'investor_id', label: 'Investor ID', hint: 'UUID of existing investor', required: false },
    { field: 'asset_name', label: 'Asset Name', hint: 'Must match existing asset', required: false },
    { field: 'asset_id', label: 'Asset ID', hint: 'UUID of existing asset', required: false },
    { field: 'units', label: 'Units', hint: 'Number of units/shares', required: true },
    { field: 'acquired_at', label: 'Acquired At', hint: 'YYYY-MM-DD', required: true },
  ],
  eligibility_criteria: [
    { field: 'jurisdiction', label: 'Jurisdiction', hint: 'DE, LU, IE, FR...', required: true },
    { field: 'investor_type', label: 'Investor Type', hint: 'institutional, professional, retail...', required: true },
    { field: 'minimum_investment', label: 'Min Investment', hint: 'Amount in base currency', required: true },
    { field: 'effective_date', label: 'Effective Date', hint: 'YYYY-MM-DD', required: true },
    { field: 'fund_ref', label: 'Fund Ref', hint: 'Reference to a fund structure', required: false },
    { field: 'maximum_allocation_pct', label: 'Max Allocation %', hint: '0-100', required: false },
    { field: 'suitability_required', label: 'Suitability Req.', hint: 'true / false', required: false },
    { field: 'source_reference', label: 'Source Reference', hint: 'Regulation citation', required: false },
  ],
};

const CSV_STEPS: { key: CsvStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map Columns' },
  { key: 'preview', label: 'Preview & Edit' },
  { key: 'complete', label: 'Import' },
];

const ROWS_PER_PAGE = 20;

function CsvStepper({ current }: { current: CsvStep }) {
  const currentIdx = current === 'importing' ? 2 : CSV_STEPS.findIndex(s => s.key === current);
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {CSV_STEPS.map((s, i) => {
        const isActive = i === currentIdx;
        const isComplete = i < currentIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div className={`h-px w-8 ${isComplete ? 'bg-accent-400' : 'bg-edge'}`} />}
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isActive ? 'bg-accent-500 text-white' :
                isComplete ? 'bg-accent-500/20 text-accent-400' :
                'bg-bg-tertiary text-ink-tertiary'
              }`}>
                {isComplete ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-ink' : 'text-ink-tertiary'}`}>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Editable Cell Component ──────────────────────────────

function EditableCell({
  value,
  meta,
  required,
  onChange,
}: {
  value: string;
  meta: FieldMeta | undefined;
  required: boolean;
  onChange: (val: string) => void;
}) {
  const hasError = required && !value;
  const validationError = meta?.validate?.(value);
  const isInvalid = hasError || !!validationError;

  const baseCls = `block w-full rounded border px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-1 ${
    isInvalid
      ? 'border-red-500 bg-red-500/5 focus:ring-red-400/30'
      : 'border-edge bg-bg-primary focus:border-accent-400 focus:ring-accent-400/30'
  }`;

  if (meta?.type === 'enum' || meta?.type === 'boolean') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={baseCls}>
        <option value="">—</option>
        {meta.options?.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (meta?.type === 'number') {
    return (
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={baseCls}
        placeholder="0"
      />
    );
  }

  if (meta?.type === 'date') {
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={baseCls}
        placeholder="YYYY-MM-DD"
      />
    );
  }

  // text (default)
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={baseCls}
    />
  );
}

// ── Main Component ───────────────────────────────────────

interface CsvUploadWizardProps {
  entityType: ImportEntityType;
  onComplete: (result: BulkImportResult) => void;
  onCancel: () => void;
  onStartEligibility?: () => void;
}

export function CsvUploadWizard({ entityType, onComplete, onCancel, onStartEligibility }: CsvUploadWizardProps) {
  const [step, setStep] = useState<CsvStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [editedRows, setEditedRows] = useState<string[][]>([]);
  const [mappedFields, setMappedFields] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schemaFields = SCHEMA_FIELDS[entityType];
  const requiredFields = schemaFields.filter(f => f.required).map(f => f.field);
  const fieldMetas = FIELD_META[entityType];

  // ── Client-side CSV parsing ────────────────────────────

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      const result = parseCsvFull(text, entityType);

      if (result.totalRows === 0) {
        setError('CSV file is empty or contains no data rows.');
        return;
      }

      setParseResult(result);
      setAllRows(result.allRows);
      setColumnMapping(result.suggestedMapping);
      setStep('map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    }
  }, [entityType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      handleFile(droppedFile);
    } else {
      setError('Please upload a .csv file.');
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }, [handleFile]);

  const updateMapping = (csvCol: string, schemaField: string) => {
    setColumnMapping(prev => {
      const next = { ...prev };
      if (schemaField === '') {
        delete next[csvCol];
      } else {
        next[csvCol] = schemaField;
      }
      return next;
    });
  };

  const mappedRequiredFields = requiredFields.filter(f => Object.values(columnMapping).includes(f));
  const allRequiredMapped = mappedRequiredFields.length === requiredFields.length;

  // ── Initialize editable rows from mapping ──────────────

  const initializeEditedRows = useCallback(() => {
    if (!parseResult || allRows.length === 0) return;

    // Determine which schema fields are mapped and their CSV column indices
    const fields: string[] = [];
    const colIndices: number[] = [];

    for (const sf of schemaFields) {
      // Find the CSV column mapped to this schema field
      const csvCol = Object.entries(columnMapping).find(([, target]) => target === sf.field)?.[0];
      if (csvCol) {
        fields.push(sf.field);
        colIndices.push(parseResult.columns.indexOf(csvCol));
      }
    }

    setMappedFields(fields);

    // Build editable rows: for each data row, extract the mapped column values
    const rows = allRows.map(row =>
      colIndices.map(idx => (idx >= 0 && idx < row.length ? row[idx] : ''))
    );
    setEditedRows(rows);
    setPage(0);
  }, [parseResult, allRows, columnMapping, schemaFields]);

  // ── Validation ─────────────────────────────────────────

  const validationErrors = useMemo(() => {
    let count = 0;
    for (let r = 0; r < editedRows.length; r++) {
      for (let c = 0; c < mappedFields.length; c++) {
        const field = mappedFields[c];
        const value = editedRows[r][c] || '';
        const isRequired = requiredFields.includes(field);
        const meta = fieldMetas[field];

        if (isRequired && !value) { count++; continue; }
        if (meta?.validate && value && meta.validate(value)) count++;
      }
    }
    return count;
  }, [editedRows, mappedFields, requiredFields, fieldMetas]);

  // Check that all required fields have at least some valid values
  const hasRequiredEmpty = useMemo(() => {
    for (let r = 0; r < editedRows.length; r++) {
      for (let c = 0; c < mappedFields.length; c++) {
        if (requiredFields.includes(mappedFields[c]) && !editedRows[r][c]) return true;
      }
    }
    return false;
  }, [editedRows, mappedFields, requiredFields]);

  // ── Cell change handler ────────────────────────────────

  const handleCellChange = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setEditedRows(prev => {
      const copy = [...prev];
      const rowCopy = [...copy[rowIndex]];
      rowCopy[colIndex] = value;
      copy[rowIndex] = rowCopy;
      return copy;
    });
  }, []);

  // ── Build payload and import ───────────────────────────

  const handleImport = async () => {
    setStep('importing');
    setError(null);

    try {
      const payload = buildPayload(editedRows, mappedFields, entityType);
      const result = await api.bulkImport(payload);
      setImportResult(result);
      setStep('complete');
    } catch (err) {
      const apiErr = err as ApiError & { errors?: ImportRowError[]; debug?: string };
      const msg = apiErr?.message || 'Import failed. Please check your data and try again.';
      setError(apiErr?.debug ? `${msg} (${apiErr.debug})` : msg);
      if (apiErr?.errors) {
        setImportResult({
          success: false,
          summary: { fund_structures: 0, assets: 0, investors: 0, holdings: 0, eligibility_criteria: 0, total: 0 },
          created: { fund_structures: [], assets: [], investors: [], holdings: [], eligibility_criteria: [] },
          ref_map: {}, errors: apiErr.errors, skipped: 0,
        } as BulkImportResult);
      }
      setStep('preview');
    }
  };

  const handleDownloadTemplate = () => {
    api.downloadTemplate(entityType).catch(() => {
      window.open(api.getTemplateDownloadUrl(entityType), '_blank');
    });
  };

  // ── Step: Upload ───────────────────────────────────────
  if (step === 'upload') {
    return (
      <>
      <CsvStepper current="upload" />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-ink">Import {ENTITY_TYPE_LABELS[entityType]}</h3>
            <p className="text-xs text-ink-secondary mt-0.5">Upload a CSV file with your {entityType.replace(/_/g, ' ')} data.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
            Download Template
          </Button>
        </div>

        {error && <Alert variant="error" title="Error">{error}</Alert>}

        <div
          className={`relative mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
            dragOver
              ? 'border-accent-400 bg-accent-500/5'
              : 'border-edge hover:border-edge-strong'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <svg className="mb-3 h-8 w-8 text-ink-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-ink-secondary mb-1">
            Drag and drop your CSV file here
          </p>
          <p className="text-xs text-ink-tertiary mb-3">or</p>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="mt-3 text-[10px] text-ink-muted">
            CSV files only, max 5MB, max 5,000 rows
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
      </>
    );
  }

  // ── Step: Map Columns ──────────────────────────────────
  if (step === 'map' && parseResult) {
    const targetCounts: Record<string, number> = {};
    for (const t of Object.values(columnMapping)) {
      if (t) targetCounts[t] = (targetCounts[t] || 0) + 1;
    }
    const hasDuplicates = Object.values(targetCounts).some(c => c > 1);

    return (
      <>
      <CsvStepper current="map" />
      <Card>
        <h3 className="text-base font-semibold text-ink mb-1">Map Columns</h3>
        <p className="text-xs text-ink-secondary mb-4">
          Map your CSV columns to {ENTITY_TYPE_LABELS[entityType].toLowerCase()} fields.
          {file && <span className="ml-1 text-ink-tertiary">({file.name}, {parseResult.totalRows} rows)</span>}
        </p>

        {error && <Alert variant="error" title="Error">{error}</Alert>}

        {hasDuplicates && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-amber-600">
              Multiple CSV columns are mapped to the same field. Only the last column&apos;s data will be used.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {parseResult.columns.map((csvCol) => {
            const currentMapping = columnMapping[csvCol] || '';
            const isRequired = currentMapping && requiredFields.includes(currentMapping);
            const isDuplicate = currentMapping && (targetCounts[currentMapping] || 0) > 1;
            const colIdx = parseResult.columns.indexOf(csvCol);
            const sampleValues = parseResult.preview
              .map(row => row[colIdx])
              .filter(Boolean)
              .slice(0, 3);
            return (
              <div key={csvCol} className="flex items-center gap-3">
                <div className="w-1/3 min-w-0">
                  <span className="text-sm font-mono text-ink truncate block" title={csvCol}>{csvCol}</span>
                  {sampleValues.length > 0 && (
                    <span className="text-[10px] text-ink-muted truncate block mt-0.5" title={sampleValues.join(', ')}>
                      e.g. {sampleValues.join(', ')}
                    </span>
                  )}
                </div>
                <svg className="h-4 w-4 text-ink-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex-1">
                  <select
                    value={currentMapping}
                    onChange={(e) => updateMapping(csvCol, e.target.value)}
                    className={`block w-full rounded-lg border px-3 py-1.5 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30 ${
                      isDuplicate
                        ? 'border-amber-500/50 bg-amber-500/5 text-ink'
                        : currentMapping
                        ? 'border-accent-400/30 bg-accent-500/5 text-ink'
                        : 'border-edge bg-bg-primary text-ink-secondary'
                    }`}
                  >
                    <option value="">— Skip this column —</option>
                    {schemaFields.map((sf) => (
                      <option key={sf.field} value={sf.field}>
                        {sf.label}{sf.required ? ' *' : ''}{sf.hint ? ` (${sf.hint})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {isRequired && (
                  <Badge variant="green">Required</Badge>
                )}
              </div>
            );
          })}
        </div>

        {!allRequiredMapped && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-amber-600">
              Required fields not yet mapped: {requiredFields.filter(f => !Object.values(columnMapping).includes(f)).join(', ')}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={() => { setStep('upload'); setFile(null); setParseResult(null); setAllRows([]); }}>
            Back
          </Button>
          <Button onClick={() => { initializeEditedRows(); setStep('preview'); }} disabled={!allRequiredMapped}>
            Next: Preview & Edit
          </Button>
        </div>
      </Card>
      </>
    );
  }

  // ── Step: Preview & Edit ───────────────────────────────
  if ((step === 'preview') && parseResult && editedRows.length > 0) {
    const totalPages = Math.ceil(editedRows.length / ROWS_PER_PAGE);
    const pageRows = editedRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    const startRow = page * ROWS_PER_PAGE;

    // Find which schema fields map to the mapped fields (for labels)
    const fieldLabels = mappedFields.map(f => {
      const sf = schemaFields.find(s => s.field === f);
      return sf?.label || f;
    });

    return (
      <>
      <CsvStepper current="preview" />
      <Card>
        <h3 className="text-base font-semibold text-ink mb-1">Preview & Edit</h3>
        <p className="text-xs text-ink-secondary mb-2">
          {editedRows.length} {entityType.replace(/_/g, ' ')} to import.
          Edit values below — use dropdowns to correct field values before importing.
        </p>

        {error && (
          <Alert variant="error" title="Import Error">
            <p>{error}</p>
            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold">Row-level errors:</p>
                {importResult.errors.slice(0, 10).map((rowErr, i) => (
                  <p key={i} className="text-xs">
                    Row {rowErr.index + 1}: {rowErr.errors.join('; ')}
                  </p>
                ))}
                {importResult.errors.length > 10 && (
                  <p className="text-xs text-ink-muted">...and {importResult.errors.length - 10} more</p>
                )}
              </div>
            )}
          </Alert>
        )}

        {validationErrors > 0 && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-xs text-red-600">
              {validationErrors} cell{validationErrors !== 1 ? 's' : ''} {validationErrors !== 1 ? 'have' : 'has'} invalid or missing values. Fix them to enable import.
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-edge">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="px-2 py-2 font-medium text-ink-tertiary w-10">#</th>
                {fieldLabels.map((label, idx) => (
                  <th key={idx} className="px-2 py-2 font-medium text-ink-tertiary whitespace-nowrap">
                    {label}
                    {requiredFields.includes(mappedFields[idx]) && <span className="text-red-400 ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {pageRows.map((row, ri) => {
                const absoluteRow = startRow + ri;
                return (
                  <tr key={absoluteRow} className="hover:bg-bg-tertiary/50">
                    <td className="px-2 py-1 text-ink-muted tabular-nums text-[10px]">{absoluteRow + 1}</td>
                    {row.map((cellValue, ci) => {
                      const field = mappedFields[ci];
                      const meta = fieldMetas[field];
                      const isReq = requiredFields.includes(field);
                      return (
                        <td key={ci} className="px-1 py-1 min-w-[100px] max-w-[200px]">
                          <EditableCell
                            value={cellValue}
                            meta={meta}
                            required={isReq}
                            onChange={(val) => handleCellChange(absoluteRow, ci, val)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-ink-secondary">
              Showing rows {startRow + 1}–{Math.min(startRow + ROWS_PER_PAGE, editedRows.length)} of {editedRows.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Prev
              </Button>
              <span className="text-ink-secondary">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-ink-secondary">
          <Badge variant="gray">{mappedFields.length} columns mapped</Badge>
          <Badge variant="gray">{editedRows.length} rows</Badge>
          {validationErrors > 0 && <Badge variant="red">{validationErrors} errors</Badge>}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={() => setStep('map')}>Back</Button>
          <Button onClick={handleImport} disabled={hasRequiredEmpty}>
            Import {editedRows.length} {ENTITY_TYPE_LABELS[entityType]}
          </Button>
        </div>
      </Card>
      </>
    );
  }

  // ── Step: Importing ────────────────────────────────────
  if (step === 'importing') {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-400 border-t-transparent mb-4" />
          <p className="text-sm font-medium text-ink">Importing data...</p>
          <p className="text-xs text-ink-secondary mt-1">This may take a moment for large files.</p>
        </div>
      </Card>
    );
  }

  // ── Step: Complete ─────────────────────────────────────
  if (step === 'complete' && importResult) {
    const investorCount = importResult.summary.investors;
    return (
      <>
      <CsvStepper current="complete" />
      <Card>
        <div className="flex flex-col items-center text-center py-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">Import Complete</h3>
          <p className="text-xs text-ink-secondary mb-4">
            Successfully imported {importResult.summary.total} entities.
          </p>
          {importResult.warnings && importResult.warnings.length > 0 && (
            <div className="mb-4 w-full max-w-xs rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-xs font-medium text-amber-600 mb-1">{importResult.warnings.length} warning{importResult.warnings.length !== 1 ? 's' : ''}</p>
              {importResult.warnings.slice(0, 5).map((w, i) => (
                <p key={i} className="text-[10px] text-amber-500">Row {w.index + 1}: {w.message} ({w.action})</p>
              ))}
            </div>
          )}
          <div className="mx-auto max-w-xs space-y-1.5 mb-6 w-full">
            {importResult.summary.fund_structures > 0 && (
              <div className="flex justify-between rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs">
                <span className="text-ink-secondary">Fund structures</span>
                <Badge variant="green">{importResult.summary.fund_structures}</Badge>
              </div>
            )}
            {importResult.summary.investors > 0 && (
              <div className="flex justify-between rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs">
                <span className="text-ink-secondary">Investors</span>
                <Badge variant="green">{importResult.summary.investors}</Badge>
              </div>
            )}
            {importResult.summary.assets > 0 && (
              <div className="flex justify-between rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs">
                <span className="text-ink-secondary">Assets</span>
                <Badge variant="green">{importResult.summary.assets}</Badge>
              </div>
            )}
            {importResult.summary.holdings > 0 && (
              <div className="flex justify-between rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs">
                <span className="text-ink-secondary">Holdings</span>
                <Badge variant="green">{importResult.summary.holdings}</Badge>
              </div>
            )}
            {importResult.summary.eligibility_criteria > 0 && (
              <div className="flex justify-between rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs">
                <span className="text-ink-secondary">Eligibility criteria</span>
                <Badge variant="green">{importResult.summary.eligibility_criteria}</Badge>
              </div>
            )}
          </div>

          {investorCount > 0 && onStartEligibility && (
            <div className="mb-4 w-full max-w-xs rounded-lg border border-accent-400/20 bg-accent-500/5 px-4 py-3">
              <p className="text-xs font-medium text-ink mb-1">Next step</p>
              <p className="text-[11px] text-ink-secondary mb-2">
                Submit your {investorCount} investor{investorCount !== 1 ? 's' : ''} for eligibility checking against your fund rules.
              </p>
              <Button size="sm" onClick={onStartEligibility}>
                Start Eligibility Checks
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {investorCount > 0 && onStartEligibility && (
              <Button variant="secondary" onClick={() => onComplete(importResult)}>
                Continue to Dashboard
              </Button>
            )}
            {!(investorCount > 0 && onStartEligibility) && (
              <Button onClick={() => onComplete(importResult)}>
                Continue to Dashboard
              </Button>
            )}
          </div>
        </div>
      </Card>
      </>
    );
  }

  return null;
}

// ── Build BulkImportPayload from edited rows ─────────────

function buildPayload(
  rows: string[][],
  fields: string[],
  entityType: ImportEntityType,
): BulkImportPayload {
  const BOOLEAN_FIELDS = ['accredited', 'suitability_required'];
  const NUMBER_FIELDS = ['total_units', 'units', 'target_size', 'minimum_investment', 'maximum_allocation_pct', 'unit_price'];

  const entities = rows.map((row, rowIndex) => {
    const entity: Record<string, unknown> = {};

    if (entityType === 'investors' || entityType === 'fund_structures') {
      entity.ref = `csv-${rowIndex}`;
    }

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const value = row[i];
      if (value === undefined || value === '') continue;

      if (BOOLEAN_FIELDS.includes(field)) {
        entity[field] = value.toLowerCase() === 'true' || value === '1';
      } else if (NUMBER_FIELDS.includes(field)) {
        const num = Number(value.replace(/[,\s]/g, ''));
        if (!isNaN(num)) entity[field] = num;
      } else {
        entity[field] = value;
      }
    }

    return entity;
  });

  // For holdings: resolve name refs
  if (entityType === 'holdings') {
    for (const entity of entities) {
      if (entity.investor_name && !entity.investor_id && !entity.investor_ref) {
        entity.investor_ref = entity.investor_name as string;
      }
      if (entity.asset_name && !entity.asset_id && !entity.asset_ref) {
        entity.asset_ref = entity.asset_name as string;
      }
    }
  }

  const payload: BulkImportPayload = {};

  switch (entityType) {
    case 'investors':
      payload.investors = entities as unknown as BulkImportPayload['investors'];
      break;
    case 'fund_structures':
      payload.fundStructures = entities as unknown as BulkImportPayload['fundStructures'];
      break;
    case 'holdings':
      payload.holdings = entities as unknown as BulkImportPayload['holdings'];
      break;
    case 'eligibility_criteria':
      payload.eligibilityCriteria = entities as unknown as BulkImportPayload['eligibilityCriteria'];
      break;
  }

  return payload;
}
