// Core domain models for the Private Asset Registry

/**
 * Asset - Represents a private asset (e.g., fund, LP interest)
 */
export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  created_at: string;
}

/**
 * Investor - Represents an investor in the registry
 */
export interface Investor {
  id: string;
  name: string;
  jurisdiction: string;
  accredited: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Holding - Represents ownership of units in an asset
 */
export interface Holding {
  id: string;
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * RuleSet - Transfer rules for an asset
 */
export interface RuleSet {
  id: string;
  asset_id: string;
  version: number;
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[]; // Array of ISO 3166 country codes
  transfer_whitelist: string[] | null; // Array of investor IDs, null = unrestricted
  created_at: string;
}

/**
 * Transfer - Record of an executed transfer
 */
export interface Transfer {
  id: string;
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  executed_at: string;
  created_at: string;
}

/**
 * Event - Audit trail entry
 */
export interface Event {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Event types for audit trail
 */
export type EventType =
  | 'asset.created'
  | 'investor.created'
  | 'investor.updated'
  | 'holding.allocated'
  | 'holding.updated'
  | 'rules.created'
  | 'rules.updated'
  | 'transfer.executed'
  | 'transfer.rejected';

/**
 * Entity types in the system
 */
export type EntityType =
  | 'asset'
  | 'investor'
  | 'holding'
  | 'rules'
  | 'transfer';

/**
 * Input types for creating new entities (without generated fields)
 */

export interface CreateAssetInput {
  name: string;
  asset_type: string;
  total_units: number;
}

export interface CreateInvestorInput {
  name: string;
  jurisdiction: string;
  accredited: boolean;
}

export interface CreateHoldingInput {
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at: string;
}

export interface CreateRuleSetInput {
  asset_id: string;
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[];
  transfer_whitelist: string[] | null;
}

export interface CreateTransferInput {
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  executed_at: string;
}

export interface CreateEventInput {
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, unknown>;
}

/**
 * Update types for modifying entities
 */

export interface UpdateInvestorInput {
  name?: string;
  jurisdiction?: string;
  accredited?: boolean;
}

export interface UpdateHoldingInput {
  units?: number;
}