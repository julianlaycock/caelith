import { randomUUID } from 'crypto';
import { query } from '../db.js';
import {
  FundStructure,
  CreateFundStructureInput,
  UpdateFundStructureInput,
} from '../models/index.js';

export async function createFundStructure(input: CreateFundStructureInput): Promise<FundStructure> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await query(
    `INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework,
       aifm_name, aifm_lei, inception_date, target_size, currency, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      id, input.name, input.legal_form, input.domicile, input.regulatory_framework,
      input.aifm_name ?? null, input.aifm_lei ?? null, input.inception_date ?? null,
      input.target_size ?? null, input.currency ?? 'EUR', input.status ?? 'active',
      now, now,
    ]
  );

  return rowToFundStructure(result[0]);
}

export async function findFundStructureById(id: string): Promise<FundStructure | null> {
  const result = await query('SELECT * FROM fund_structures WHERE id = $1', [id]);
  return result[0] ? rowToFundStructure(result[0]) : null;
}

export async function findAllFundStructures(): Promise<FundStructure[]> {
  const result = await query('SELECT * FROM fund_structures ORDER BY created_at DESC');
  return result.map(rowToFundStructure);
}

export async function findFundStructuresByDomicile(domicile: string): Promise<FundStructure[]> {
  const result = await query(
    'SELECT * FROM fund_structures WHERE domicile = $1 ORDER BY name',
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

  const result = await query(
    `UPDATE fund_structures SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  return result[0] ? rowToFundStructure(result[0]) : null;
}

function rowToFundStructure(row: any): FundStructure {
  return {
    id: row.id,
    name: row.name,
    legal_form: row.legal_form,
    domicile: row.domicile,
    regulatory_framework: row.regulatory_framework,
    aifm_name: row.aifm_name ?? null,
    aifm_lei: row.aifm_lei ?? null,
    inception_date: row.inception_date ? String(row.inception_date) : null,
    target_size: row.target_size ? Number(row.target_size) : null,
    currency: row.currency,
    status: row.status,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
