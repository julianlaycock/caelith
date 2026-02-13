import { randomUUID } from 'crypto';
import { query, execute, queryWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import {
  FundStructure,
  CreateFundStructureInput,
  UpdateFundStructureInput,
  LegalForm,
  RegulatoryFramework,
  FundStatus,
} from '../models/index.js';

export async function createFundStructure(input: CreateFundStructureInput): Promise<FundStructure> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await query<FundStructureRow>(
    `INSERT INTO fund_structures (id, tenant_id, name, legal_form, domicile, regulatory_framework,
       aifm_name, aifm_lei, inception_date, target_size, currency, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      id, DEFAULT_TENANT_ID, input.name, input.legal_form, input.domicile, input.regulatory_framework,
      input.aifm_name ?? null, input.aifm_lei ?? null, input.inception_date ?? null,
      input.target_size ?? null, input.currency ?? 'EUR', input.status ?? 'active',
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
  created_at: string | Date;
  updated_at: string | Date;
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
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
