/**
 * Bulk Import Service
 *
 * Transactional multi-entity import for pilot customer onboarding.
 * Accepts fund structures, investors, holdings, and eligibility criteria
 * in a single payload. All-or-nothing: if any entity fails validation,
 * the entire import is rolled back.
 */

import { randomUUID } from 'crypto';
import { DEFAULT_TENANT_ID } from '../db.js';
import { withTenantTransaction } from './transaction-helper.js';
import { ValidationError } from '../errors.js';

import {
  InvestorType,
  KycStatus,
  LegalForm,
  RegulatoryFramework,
} from '../models/index.js';

// ── Input Types ──────────────────────────────────────────────────────────────

export interface BulkImportPayload {
  fundStructures?: BulkFundStructure[];
  investors?: BulkInvestor[];
  holdings?: BulkHolding[];
  eligibilityCriteria?: BulkEligibilityCriteria[];
  mode?: 'strict' | 'best_effort';
}

export interface BulkFundStructure {
  ref?: string;  // client-side reference for linking assets/criteria
  name: string;
  legal_form: LegalForm;
  domicile: string;
  regulatory_framework: RegulatoryFramework;
  aifm_name?: string;
  aifm_lei?: string;
  inception_date?: string;
  target_size?: number;
  currency?: string;
  status?: string;
  // asset linked to this fund
  asset_name?: string;
  asset_type?: string;
  total_units?: number;
  unit_price?: number;
}

export interface BulkInvestor {
  ref?: string;  // client-side reference for linking holdings
  name: string;
  jurisdiction: string;
  accredited?: boolean;
  investor_type?: InvestorType;
  kyc_status?: KycStatus;
  kyc_expiry?: string;
  tax_id?: string;
  lei?: string;
  email?: string;
}

export interface BulkHolding {
  investor_ref?: string;  // references BulkInvestor.ref
  investor_id?: string;   // or direct ID for existing investors
  asset_ref?: string;     // references BulkFundStructure.ref (resolves to its asset)
  asset_id?: string;      // or direct ID for existing assets
  units: number;
  acquired_at: string;
}

export interface BulkEligibilityCriteria {
  fund_ref?: string;          // references BulkFundStructure.ref
  fund_structure_id?: string; // or direct ID
  jurisdiction: string;
  investor_type: InvestorType;
  minimum_investment: number;
  maximum_allocation_pct?: number;
  documentation_required?: string[];
  suitability_required?: boolean;
  source_reference?: string;
  effective_date: string;
}

// ── Result Types ─────────────────────────────────────────────────────────────

export interface ImportRowError {
  entityType: string;
  index: number;
  ref?: string;
  errors: string[];
}

export interface ImportWarning {
  entityType: string;
  index: number;
  message: string;
  existingId?: string;
  action: 'created' | 'skipped';
}

export interface BulkImportResult {
  success: boolean;
  summary: {
    fund_structures: number;
    assets: number;
    investors: number;
    holdings: number;
    eligibility_criteria: number;
    total: number;
  };
  created: {
    fund_structures: EntityResult[];
    assets: EntityResult[];
    investors: EntityResult[];
    holdings: EntityResult[];
    eligibility_criteria: EntityResult[];
  };
  ref_map: Record<string, string>;
  errors?: ImportRowError[];
  warnings?: ImportWarning[];
  skipped: number;
}

export interface EntityResult {
  id: string;
  ref?: string;
  name?: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_INVESTOR_TYPES: InvestorType[] = [
  'institutional', 'professional', 'semi_professional', 'well_informed', 'retail',
];

const VALID_KYC_STATUSES: KycStatus[] = ['pending', 'verified', 'expired', 'rejected'];

const VALID_LEGAL_FORMS: LegalForm[] = [
  'SICAV', 'SIF', 'RAIF', 'SCSp', 'SCA', 'ELTIF',
  'Spezial_AIF', 'Publikums_AIF', 'QIAIF', 'RIAIF', 'LP', 'other',
];

const VALID_FRAMEWORKS: RegulatoryFramework[] = ['AIFMD', 'UCITS', 'ELTIF', 'national'];

export function validatePayload(payload: BulkImportPayload): string[] {
  const errors: string[] = [];
  const { fundStructures = [], investors = [], holdings = [], eligibilityCriteria = [] } = payload;

  // Validate fund structures
  const fundRefs = new Set<string>();
  fundStructures.forEach((f, i) => {
    if (!f.name?.trim()) errors.push(`fundStructures[${i}]: name is required`);
    if (!f.legal_form) errors.push(`fundStructures[${i}]: legal_form is required`);
    else if (!VALID_LEGAL_FORMS.includes(f.legal_form)) errors.push(`fundStructures[${i}]: invalid legal_form '${f.legal_form}'`);
    if (!f.domicile?.trim()) errors.push(`fundStructures[${i}]: domicile is required`);
    if (!f.regulatory_framework) errors.push(`fundStructures[${i}]: regulatory_framework is required`);
    else if (!VALID_FRAMEWORKS.includes(f.regulatory_framework)) errors.push(`fundStructures[${i}]: invalid regulatory_framework '${f.regulatory_framework}'`);
    if (f.ref) {
      if (fundRefs.has(f.ref)) errors.push(`fundStructures[${i}]: duplicate ref '${f.ref}'`);
      fundRefs.add(f.ref);
    }
    if (f.total_units !== undefined && f.total_units <= 0) errors.push(`fundStructures[${i}]: total_units must be > 0`);
  });

  // Validate investors
  const investorRefs = new Set<string>();
  investors.forEach((inv, i) => {
    if (!inv.name?.trim()) errors.push(`investors[${i}]: name is required`);
    if (!inv.jurisdiction?.trim()) errors.push(`investors[${i}]: jurisdiction is required`);
    if (inv.investor_type && !VALID_INVESTOR_TYPES.includes(inv.investor_type)) {
      errors.push(`investors[${i}]: invalid investor_type '${inv.investor_type}'`);
    }
    if (inv.kyc_status && !VALID_KYC_STATUSES.includes(inv.kyc_status)) {
      errors.push(`investors[${i}]: invalid kyc_status '${inv.kyc_status}'`);
    }
    if (inv.ref) {
      if (investorRefs.has(inv.ref)) errors.push(`investors[${i}]: duplicate ref '${inv.ref}'`);
      investorRefs.add(inv.ref);
    }
  });

  // Validate holdings (cross-reference checks)
  holdings.forEach((h, i) => {
    if (!h.investor_ref && !h.investor_id) errors.push(`holdings[${i}]: investor_ref or investor_id is required`);
    if (!h.asset_ref && !h.asset_id) errors.push(`holdings[${i}]: asset_ref or asset_id is required`);
    if (h.investor_ref && !investorRefs.has(h.investor_ref)) {
      errors.push(`holdings[${i}]: investor_ref '${h.investor_ref}' does not match any investor`);
    }
    if (h.asset_ref && !fundRefs.has(h.asset_ref)) {
      errors.push(`holdings[${i}]: asset_ref '${h.asset_ref}' does not match any fund structure`);
    }
    if (!h.units || h.units <= 0) errors.push(`holdings[${i}]: units must be > 0`);
    if (!h.acquired_at?.trim()) errors.push(`holdings[${i}]: acquired_at is required`);
  });

  // Validate eligibility criteria
  eligibilityCriteria.forEach((ec, i) => {
    if (!ec.fund_ref && !ec.fund_structure_id) errors.push(`eligibilityCriteria[${i}]: fund_ref or fund_structure_id is required`);
    if (ec.fund_ref && !fundRefs.has(ec.fund_ref)) {
      errors.push(`eligibilityCriteria[${i}]: fund_ref '${ec.fund_ref}' does not match any fund structure`);
    }
    if (!ec.jurisdiction?.trim()) errors.push(`eligibilityCriteria[${i}]: jurisdiction is required`);
    if (!VALID_INVESTOR_TYPES.includes(ec.investor_type)) {
      errors.push(`eligibilityCriteria[${i}]: invalid investor_type '${ec.investor_type}'`);
    }
    if (ec.minimum_investment === undefined || ec.minimum_investment < 0) {
      errors.push(`eligibilityCriteria[${i}]: minimum_investment must be >= 0`);
    }
    if (!ec.effective_date?.trim()) errors.push(`eligibilityCriteria[${i}]: effective_date is required`);
  });

  return errors;
}

// ── Import Execution ─────────────────────────────────────────────────────────

export async function executeBulkImport(
  payload: BulkImportPayload,
  tenantId?: string,
  userId?: string,
): Promise<BulkImportResult> {
  // Phase 1: Validate everything upfront
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    throw new ValidationError(`Import validation failed:\n${errors.join('\n')}`);
  }

  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;
  const { fundStructures = [], investors = [], holdings = [], eligibilityCriteria = [] } = payload;
  const refMap: Record<string, string> = {};

  const mode = payload.mode || 'strict';
  const importErrors: ImportRowError[] = [];
  const importWarnings: ImportWarning[] = [];

  const result: BulkImportResult = {
    success: true,
    summary: { fund_structures: 0, assets: 0, investors: 0, holdings: 0, eligibility_criteria: 0, total: 0 },
    created: { fund_structures: [], assets: [], investors: [], holdings: [], eligibility_criteria: [] },
    ref_map: refMap,
    skipped: 0,
  };

  if (fundStructures.length === 0 && investors.length === 0 && holdings.length === 0 && eligibilityCriteria.length === 0) {
    return result;
  }

  // Phase 2: Execute all inserts in a single transaction (with RLS tenant context)
  await withTenantTransaction(effectiveTenantId, async (client) => {
    const now = new Date().toISOString();

    // 2a: Fund structures + auto-created assets (with deduplication)
    for (let idx = 0; idx < fundStructures.length; idx++) {
      const fs = fundStructures[idx];

      // Deduplication check: same name + legal_form + domicile
      const fundDupeCheck = await client.query(
        `SELECT id, name FROM fund_structures WHERE LOWER(name) = LOWER($1) AND legal_form = $2 AND domicile = $3 AND tenant_id = $4 LIMIT 1`,
        [fs.name, fs.legal_form, fs.domicile, effectiveTenantId]
      );

      if (fundDupeCheck.rows.length > 0) {
        const existing = fundDupeCheck.rows[0];
        importWarnings.push({
          entityType: 'fund_structures',
          index: idx,
          message: `Fund '${fs.name}' (${fs.legal_form}, ${fs.domicile}) already exists`,
          existingId: existing.id,
          action: 'skipped',
        });
        if (fs.ref) refMap[`fund:${fs.ref}`] = existing.id;
        // Try to find existing asset for this fund
        const existingAsset = await client.query(
          `SELECT id FROM assets WHERE fund_structure_id = $1 LIMIT 1`,
          [existing.id]
        );
        if (existingAsset.rows.length > 0 && fs.ref) {
          refMap[`asset:${fs.ref}`] = existingAsset.rows[0].id;
        }
        result.skipped++;
        continue;
      }

      const fundId = randomUUID();
      await client.query(
        `INSERT INTO fund_structures (id, tenant_id, name, legal_form, domicile, regulatory_framework,
           aifm_name, aifm_lei, inception_date, target_size, currency, status,
           lmt_types, leverage_limit_commitment, leverage_limit_gross,
           leverage_current_commitment, leverage_current_gross,
           liquidity_profile, geographic_exposure, counterparty_exposure,
           created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          fundId, effectiveTenantId, fs.name, fs.legal_form, fs.domicile, fs.regulatory_framework,
          fs.aifm_name ?? null, fs.aifm_lei ?? null, fs.inception_date ?? null,
          fs.target_size ?? null, fs.currency ?? 'EUR', fs.status ?? 'active',
          JSON.stringify([]), null, null, null, null,
          JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
          now, now,
        ]
      );

      if (fs.ref) refMap[`fund:${fs.ref}`] = fundId;
      result.created.fund_structures.push({ id: fundId, ref: fs.ref, name: fs.name });
      result.summary.fund_structures++;

      // Auto-create linked asset if asset_name or total_units provided
      if (fs.asset_name || fs.total_units) {
        const assetId = randomUUID();
        const assetName = fs.asset_name || `${fs.name} — Share Class`;
        const assetType = fs.asset_type || 'fund_share';
        const totalUnits = fs.total_units || 10000;

        await client.query(
          `INSERT INTO assets (id, tenant_id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [assetId, effectiveTenantId, assetName, assetType, totalUnits, fundId, fs.unit_price ?? null, now]
        );

        if (fs.ref) refMap[`asset:${fs.ref}`] = assetId;
        result.created.assets.push({ id: assetId, ref: fs.ref, name: assetName });
        result.summary.assets++;
      }
    }

    // 2b: Investors (with deduplication + optional partial success)
    for (let idx = 0; idx < investors.length; idx++) {
      const inv = investors[idx];

      // Deduplication check: same name + jurisdiction (case-insensitive)
      const dupeCheck = await client.query(
        `SELECT id, name FROM investors WHERE LOWER(name) = LOWER($1) AND LOWER(jurisdiction) = LOWER($2) AND tenant_id = $3 LIMIT 1`,
        [inv.name, inv.jurisdiction, effectiveTenantId]
      );

      if (dupeCheck.rows.length > 0) {
        const existing = dupeCheck.rows[0];
        importWarnings.push({
          entityType: 'investors',
          index: idx,
          message: `Investor '${inv.name}' (${inv.jurisdiction}) already exists`,
          existingId: existing.id,
          action: 'skipped',
        });
        // Use existing ID for cross-references
        if (inv.ref) refMap[`investor:${inv.ref}`] = existing.id;
        result.skipped++;
        continue;
      }

      if (mode === 'best_effort') {
        await client.query(`SAVEPOINT investor_${idx}`);
      }

      try {
        const investorId = randomUUID();
        await client.query(
          `INSERT INTO investors (id, tenant_id, name, jurisdiction, accredited, investor_type,
             kyc_status, kyc_expiry, tax_id, lei, email,
             classification_date, classification_evidence, classification_method,
             created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            investorId, effectiveTenantId, inv.name, inv.jurisdiction,
            inv.accredited ?? false, inv.investor_type ?? 'retail',
            inv.kyc_status ?? 'verified', inv.kyc_expiry ?? null,
            inv.tax_id ?? null, inv.lei ?? null, inv.email ?? null,
            null, JSON.stringify([]), null,
            now, now,
          ]
        );

        if (mode === 'best_effort') {
          await client.query(`RELEASE SAVEPOINT investor_${idx}`);
        }

        if (inv.ref) refMap[`investor:${inv.ref}`] = investorId;
        result.created.investors.push({ id: investorId, ref: inv.ref, name: inv.name });
        result.summary.investors++;
      } catch (err) {
        if (mode === 'best_effort') {
          await client.query(`ROLLBACK TO SAVEPOINT investor_${idx}`);
          importErrors.push({
            entityType: 'investors',
            index: idx,
            ref: inv.ref,
            errors: [err instanceof Error ? err.message : 'Insert failed'],
          });
          result.skipped++;
        } else {
          throw err;
        }
      }
    }

    // 2c: Holdings (resolve refs, with optional partial success)
    for (let idx = 0; idx < holdings.length; idx++) {
      const h = holdings[idx];
      const investorId = h.investor_id || refMap[`investor:${h.investor_ref}`];
      const assetId = h.asset_id || refMap[`asset:${h.asset_ref}`];

      if (!investorId) {
        if (mode === 'best_effort') {
          importErrors.push({ entityType: 'holdings', index: idx, ref: h.investor_ref, errors: [`Holding references unknown investor: ${h.investor_ref || h.investor_id}`] });
          result.skipped++;
          continue;
        }
        throw new ValidationError(`Holding references unknown investor: ${h.investor_ref || h.investor_id}`);
      }
      if (!assetId) {
        if (mode === 'best_effort') {
          importErrors.push({ entityType: 'holdings', index: idx, ref: h.asset_ref, errors: [`Holding references unknown asset: ${h.asset_ref || h.asset_id}`] });
          result.skipped++;
          continue;
        }
        throw new ValidationError(`Holding references unknown asset: ${h.asset_ref || h.asset_id}`);
      }

      if (mode === 'best_effort') {
        await client.query(`SAVEPOINT holding_${idx}`);
      }

      try {
        // Validate asset capacity
        const capacityResult = await client.query(
          `SELECT a.total_units, COALESCE(SUM(h.units), 0)::int as allocated
           FROM assets a
           LEFT JOIN holdings h ON h.asset_id = a.id
           WHERE a.id = $1 AND a.tenant_id = $2
           GROUP BY a.total_units`,
          [assetId, effectiveTenantId]
        );

        if (capacityResult.rows.length > 0) {
          const { total_units, allocated } = capacityResult.rows[0];
          if (Number(allocated) + h.units > Number(total_units)) {
            throw new ValidationError(
              `Holding allocation exceeds capacity for asset ${assetId}. Available: ${Number(total_units) - Number(allocated)}, Requested: ${h.units}`
            );
          }
        }

        const holdingId = randomUUID();
        await client.query(
          `INSERT INTO holdings (id, tenant_id, investor_id, asset_id, units, acquired_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [holdingId, effectiveTenantId, investorId, assetId, h.units, h.acquired_at, now, now]
        );

        if (mode === 'best_effort') {
          await client.query(`RELEASE SAVEPOINT holding_${idx}`);
        }

        result.created.holdings.push({ id: holdingId, ref: h.investor_ref || h.investor_id });
        result.summary.holdings++;
      } catch (err) {
        if (mode === 'best_effort') {
          await client.query(`ROLLBACK TO SAVEPOINT holding_${idx}`);
          importErrors.push({
            entityType: 'holdings',
            index: idx,
            ref: h.investor_ref || h.asset_ref,
            errors: [err instanceof Error ? err.message : 'Insert failed'],
          });
          result.skipped++;
        } else {
          throw err;
        }
      }
    }

    // 2d: Eligibility criteria (resolve refs, with optional partial success)
    for (let idx = 0; idx < eligibilityCriteria.length; idx++) {
      const ec = eligibilityCriteria[idx];
      const fundStructureId = ec.fund_structure_id || refMap[`fund:${ec.fund_ref}`];

      if (!fundStructureId) {
        if (mode === 'best_effort') {
          importErrors.push({ entityType: 'eligibility_criteria', index: idx, ref: ec.fund_ref, errors: [`Eligibility criteria references unknown fund: ${ec.fund_ref || ec.fund_structure_id}`] });
          result.skipped++;
          continue;
        }
        throw new ValidationError(`Eligibility criteria references unknown fund: ${ec.fund_ref || ec.fund_structure_id}`);
      }

      if (mode === 'best_effort') {
        await client.query(`SAVEPOINT eligibility_${idx}`);
      }

      try {
        const criteriaId = randomUUID();
        await client.query(
          `INSERT INTO eligibility_criteria
             (id, tenant_id, fund_structure_id, jurisdiction, investor_type, minimum_investment,
              maximum_allocation_pct, documentation_required, suitability_required,
              source_reference, effective_date, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            criteriaId, effectiveTenantId, fundStructureId, ec.jurisdiction,
            ec.investor_type, ec.minimum_investment,
            ec.maximum_allocation_pct ?? null,
            JSON.stringify(ec.documentation_required ?? []),
            ec.suitability_required ?? false,
            ec.source_reference ?? null,
            ec.effective_date, now,
          ]
        );

        if (mode === 'best_effort') {
          await client.query(`RELEASE SAVEPOINT eligibility_${idx}`);
        }

        result.created.eligibility_criteria.push({ id: criteriaId, ref: ec.fund_ref });
        result.summary.eligibility_criteria++;
      } catch (err) {
        if (mode === 'best_effort') {
          await client.query(`ROLLBACK TO SAVEPOINT eligibility_${idx}`);
          importErrors.push({
            entityType: 'eligibility_criteria',
            index: idx,
            ref: ec.fund_ref,
            errors: [err instanceof Error ? err.message : 'Insert failed'],
          });
          result.skipped++;
        } else {
          throw err;
        }
      }
    }

    // Phase 3: Compute summary and write audit event (inside the transaction so RLS allows the INSERT)
    result.summary.total = result.summary.fund_structures + result.summary.assets
      + result.summary.investors + result.summary.holdings + result.summary.eligibility_criteria;

    if (importErrors.length > 0) result.errors = importErrors;
    if (importWarnings.length > 0) result.warnings = importWarnings;
    if (importErrors.length > 0) result.success = result.summary.total > 0; // partial success

    // Determine a meaningful entity_id: first created entity or a generated UUID
    const firstCreatedId =
      result.created.fund_structures[0]?.id
      || result.created.assets[0]?.id
      || result.created.investors[0]?.id
      || result.created.holdings[0]?.id
      || result.created.eligibility_criteria[0]?.id
      || randomUUID();

    // Write audit event directly via the transaction client (bypasses createEvent which
    // uses a separate pool connection without tenant context, causing RLS to block it)
    const auditId = randomUUID();
    await client.query(
      `INSERT INTO events (id, tenant_id, event_type, entity_type, entity_id, payload, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        auditId,
        effectiveTenantId,
        'bulk_import.completed',
        'system',
        firstCreatedId,
        JSON.stringify({
          operation: 'bulk_import',
          imported_by: userId || 'unknown',
          tenant_id: effectiveTenantId,
          mode,
          summary: result.summary,
          skipped: result.skipped,
          error_count: importErrors.length,
          warning_count: importWarnings.length,
        }),
        now,
      ]
    );
  });

  return result;
}
