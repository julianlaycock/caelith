/**
 * Onboarding Repository — Slice 5
 *
 * CRUD operations for the onboarding_records table.
 * Tracks investor applications through: applied → eligible/ineligible → approved/rejected → allocated
 */

import { randomUUID } from 'crypto';
import { query, execute, queryWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import {
  OnboardingRecord,
  CreateOnboardingRecordInput,
  UpdateOnboardingInput,
  OnboardingStatus,
} from '../models/index.js';

/**
 * Create a new onboarding record (status: 'applied')
 */
export async function createOnboardingRecord(
  input: CreateOnboardingRecordInput
): Promise<OnboardingRecord> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const ownerTag = input.owner_tag ?? null;
  const handoffNotes = input.handoff_notes ?? null;

  await execute(
    `INSERT INTO onboarding_records
       (id, tenant_id, investor_id, asset_id, status, requested_units, owner_tag, handoff_notes, applied_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'applied', $5, $6, $7, $8, $8, $8)`,
    [id, DEFAULT_TENANT_ID, input.investor_id, input.asset_id, input.requested_units, ownerTag, handoffNotes, now]
  );

  return {
    id,
    investor_id: input.investor_id,
    asset_id: input.asset_id,
    status: 'applied',
    requested_units: input.requested_units,
    owner_tag: ownerTag,
    handoff_notes: handoffNotes,
    eligibility_decision_id: null,
    approval_decision_id: null,
    reviewed_by: null,
    rejection_reasons: null,
    applied_at: now,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Find onboarding record by ID
 */
export async function findOnboardingById(
  id: string
): Promise<OnboardingRecord | null> {
  const results = await query<OnboardingRow>(
    'SELECT * FROM onboarding_records WHERE id = $1 AND tenant_id = $2',
    [id, DEFAULT_TENANT_ID]
  );
  if (results.length === 0) return null;
  return rowToOnboardingRecord(results[0]);
}

/**
 * Find onboarding records by asset
 */
export async function findOnboardingByAsset(
  assetId: string
): Promise<OnboardingRecord[]> {
  const results = await queryWithTenant<OnboardingRow>(
    'SELECT * FROM onboarding_records WHERE asset_id = ? ORDER BY applied_at DESC',
    [assetId]
  );
  return results.map(rowToOnboardingRecord);
}

/**
 * Find onboarding records by investor
 */
export async function findOnboardingByInvestor(
  investorId: string
): Promise<OnboardingRecord[]> {
  const results = await queryWithTenant<OnboardingRow>(
    'SELECT * FROM onboarding_records WHERE investor_id = ? ORDER BY applied_at DESC',
    [investorId]
  );
  return results.map(rowToOnboardingRecord);
}

/**
 * Update an onboarding record (status transitions + metadata)
 */
export async function updateOnboardingRecord(
  id: string,
  updates: UpdateOnboardingInput
): Promise<OnboardingRecord | null> {
  const now = new Date().toISOString();

  const setClauses: string[] = ['status = $2', 'updated_at = $3'];
  const params: (string | number | boolean | null)[] = [id, updates.status, now];
  let paramIdx = 4;

  if (updates.reviewed_by !== undefined) {
    setClauses.push(`reviewed_by = $${paramIdx}`);
    params.push(updates.reviewed_by);
    paramIdx++;
    setClauses.push(`reviewed_at = $${paramIdx}`);
    params.push(now);
    paramIdx++;
  }

  if (updates.rejection_reasons !== undefined) {
    setClauses.push(`rejection_reasons = $${paramIdx}`);
    params.push(JSON.stringify(updates.rejection_reasons));
    paramIdx++;
  }

  if (updates.eligibility_decision_id !== undefined) {
    setClauses.push(`eligibility_decision_id = $${paramIdx}`);
    params.push(updates.eligibility_decision_id);
    paramIdx++;
  }

  if (updates.approval_decision_id !== undefined) {
    setClauses.push(`approval_decision_id = $${paramIdx}`);
    params.push(updates.approval_decision_id);
    paramIdx++;
  }

  if (updates.owner_tag !== undefined) {
    setClauses.push(`owner_tag = $${paramIdx}`);
    params.push(updates.owner_tag);
    paramIdx++;
  }

  if (updates.handoff_notes !== undefined) {
    setClauses.push(`handoff_notes = $${paramIdx}`);
    params.push(updates.handoff_notes);
    paramIdx++;
  }

  params.push(DEFAULT_TENANT_ID);
  await execute(
    `UPDATE onboarding_records SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $${paramIdx}`,
    params
  );

  return findOnboardingById(id);
}

interface OnboardingRow {
  id: string;
  investor_id: string;
  asset_id: string;
  status: string;
  requested_units: number;
  owner_tag: string | null;
  handoff_notes: string | null;
  eligibility_decision_id: string | null;
  approval_decision_id: string | null;
  reviewed_by: string | null;
  rejection_reasons: string | string[] | null;
  applied_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToOnboardingRecord(row: OnboardingRow): OnboardingRecord {
  return {
    id: row.id,
    investor_id: row.investor_id,
    asset_id: row.asset_id,
    status: row.status as OnboardingStatus,
    requested_units: row.requested_units,
    owner_tag: row.owner_tag ?? null,
    handoff_notes: row.handoff_notes ?? null,
    eligibility_decision_id: row.eligibility_decision_id ?? null,
    approval_decision_id: row.approval_decision_id ?? null,
    reviewed_by: row.reviewed_by ?? null,
    rejection_reasons: row.rejection_reasons
      ? (typeof row.rejection_reasons === 'string'
          ? JSON.parse(row.rejection_reasons)
          : row.rejection_reasons)
      : null,
    applied_at: row.applied_at,
    reviewed_at: row.reviewed_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
