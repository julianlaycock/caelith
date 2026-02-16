import { randomUUID } from 'crypto';
import { query, queryWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import {
  FundStructure,
  CreateFundStructureInput,
  UpdateFundStructureInput,
  LegalForm,
  RegulatoryFramework,
  FundStatus,
  LiquidityManagementTool,
  LiquidityBucket,
  GeographicExposure,
  CounterpartyExposure,
} from '../models/index.js';

export async function createFundStructure(input: CreateFundStructureInput): Promise<FundStructure> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await query<FundStructureRow>(
    `INSERT INTO fund_structures (id, tenant_id, name, legal_form, domicile, regulatory_framework,
       aifm_name, aifm_lei, inception_date, target_size, currency, status,
       lmt_types, leverage_limit_commitment, leverage_limit_gross, leverage_current_commitment, leverage_current_gross,
       liquidity_profile, geographic_exposure, counterparty_exposure,
       created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
    [
      id, DEFAULT_TENANT_ID, input.name, input.legal_form, input.domicile, input.regulatory_framework,
      input.aifm_name ?? null, input.aifm_lei ?? null, input.inception_date ?? null,
      input.target_size ?? null, input.currency ?? 'EUR', input.status ?? 'active',
      JSON.stringify(input.lmt_types ?? []),
      input.leverage_limit_commitment ?? null, input.leverage_limit_gross ?? null,
      input.leverage_current_commitment ?? null, input.leverage_current_gross ?? null,
      JSON.stringify(input.liquidity_profile ?? []),
      JSON.stringify(input.geographic_exposure ?? []),
      JSON.stringify(input.counterparty_exposure ?? []),
      now, now,
    ]
  );

  return rowToFundStructure(result[0]);
}

export async function findFundStructureById(id: string): Promise<FundStructure | null> {
  const result = await query<FundStructureRow>('SELECT * FROM fund_structures WHERE id = $1 AND tenant_id = $2', [id, DEFAULT_TENANT_ID]);
  return result[0] ? rowToFundStructure(result[0]) : null;
}

export async function findAllFundStructures(): Promise<FundStructure[]> {
  const result = await queryWithTenant<FundStructureRow>('SELECT * FROM fund_structures ORDER BY created_at DESC');
  return result.map(rowToFundStructure);
}

export async function findFundStructuresByDomicile(domicile: string): Promise<FundStructure[]> {
  const result = await queryWithTenant<FundStructureRow>(
    'SELECT * FROM fund_structures WHERE domicile = ? ORDER BY name',
    [domicile]
  );
  return result.map(rowToFundStructure);
}

export async function updateFundStructure(id: string, input: UpdateFundStructureInput): Promise<FundStructure | null> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  let idx = 1;

  if (input.name !== undefined) { sets.push(`name = $${idx++}`); params.push(input.name); }
  if (input.aifm_name !== undefined) { sets.push(`aifm_name = $${idx++}`); params.push(input.aifm_name); }
  if (input.aifm_lei !== undefined) { sets.push(`aifm_lei = $${idx++}`); params.push(input.aifm_lei); }
  if (input.inception_date !== undefined) { sets.push(`inception_date = $${idx++}`); params.push(input.inception_date); }
  if (input.target_size !== undefined) { sets.push(`target_size = $${idx++}`); params.push(input.target_size); }
  if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
  if (input.lmt_types !== undefined) { sets.push(`lmt_types = $${idx++}`); params.push(JSON.stringify(input.lmt_types)); }
  if (input.leverage_limit_commitment !== undefined) { sets.push(`leverage_limit_commitment = $${idx++}`); params.push(input.leverage_limit_commitment); }
  if (input.leverage_limit_gross !== undefined) { sets.push(`leverage_limit_gross = $${idx++}`); params.push(input.leverage_limit_gross); }
  if (input.leverage_current_commitment !== undefined) { sets.push(`leverage_current_commitment = $${idx++}`); params.push(input.leverage_current_commitment); }
  if (input.leverage_current_gross !== undefined) { sets.push(`leverage_current_gross = $${idx++}`); params.push(input.leverage_current_gross); }
  if (input.liquidity_profile !== undefined) { sets.push(`liquidity_profile = $${idx++}`); params.push(JSON.stringify(input.liquidity_profile)); }
  if (input.geographic_exposure !== undefined) { sets.push(`geographic_exposure = $${idx++}`); params.push(JSON.stringify(input.geographic_exposure)); }
  if (input.counterparty_exposure !== undefined) { sets.push(`counterparty_exposure = $${idx++}`); params.push(JSON.stringify(input.counterparty_exposure)); }

  if (sets.length === 0) return findFundStructureById(id);

  sets.push(`updated_at = $${idx++}`);
  params.push(new Date().toISOString());
  params.push(id);
  const idIdx = idx++;
  params.push(DEFAULT_TENANT_ID);
  const tenantIdx = idx;

  const result = await query<FundStructureRow>(
    `UPDATE fund_structures SET ${sets.join(', ')} WHERE id = $${idIdx} AND tenant_id = $${tenantIdx} RETURNING *`,
    params
  );

  return result[0] ? rowToFundStructure(result[0]) : null;
}

type JsonArray = string | unknown[] | null;

interface FundStructureRow {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  regulatory_framework: string;
  aifm_name: string | null;
  aifm_lei: string | null;
  inception_date: string | Date | null;
  target_size: number | string | null;
  currency: string;
  status: string;
  lmt_types: JsonArray;
  leverage_limit_commitment: number | string | null;
  leverage_limit_gross: number | string | null;
  leverage_current_commitment: number | string | null;
  leverage_current_gross: number | string | null;
  liquidity_profile: JsonArray;
  geographic_exposure: JsonArray;
  counterparty_exposure: JsonArray;
  created_at: string | Date;
  updated_at: string | Date;
}

function parseJsonb<T>(val: JsonArray): T[] {
  if (!val) return [];
  if (typeof val === 'string') return JSON.parse(val) as T[];
  return val as T[];
}

function rowToFundStructure(row: FundStructureRow): FundStructure {
  return {
    id: row.id,
    name: row.name,
    legal_form: row.legal_form as LegalForm,
    domicile: row.domicile,
    regulatory_framework: row.regulatory_framework as RegulatoryFramework,
    aifm_name: row.aifm_name ?? null,
    aifm_lei: row.aifm_lei ?? null,
    inception_date: row.inception_date ? String(row.inception_date) : null,
    target_size: row.target_size ? Number(row.target_size) : null,
    currency: row.currency,
    status: row.status as FundStatus,
    lmt_types: parseJsonb<LiquidityManagementTool>(row.lmt_types),
    leverage_limit_commitment: row.leverage_limit_commitment != null ? Number(row.leverage_limit_commitment) : null,
    leverage_limit_gross: row.leverage_limit_gross != null ? Number(row.leverage_limit_gross) : null,
    leverage_current_commitment: row.leverage_current_commitment != null ? Number(row.leverage_current_commitment) : null,
    leverage_current_gross: row.leverage_current_gross != null ? Number(row.leverage_current_gross) : null,
    liquidity_profile: parseJsonb<LiquidityBucket>(row.liquidity_profile),
    geographic_exposure: parseJsonb<GeographicExposure>(row.geographic_exposure),
    counterparty_exposure: parseJsonb<CounterpartyExposure>(row.counterparty_exposure),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
