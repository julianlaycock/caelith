/**
 * Investor Service
 * 
 * Business logic for investor management
 */

import {
  createInvestor as createInvestorRepo,
  findInvestorById,
  findAllInvestors,
  updateInvestor as updateInvestorRepo,
  createEvent,
} from '../repositories/index.js';
import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';

/**
 * Create a new investor
 */
export async function createInvestor(input: CreateInvestorInput): Promise<Investor> {
  // Validate input
  if (!input.name.trim()) {
    throw new Error('Investor name cannot be empty');
  }

  if (!input.jurisdiction.trim()) {
    throw new Error('Jurisdiction cannot be empty');
  }

  // Create investor
  const investor = await createInvestorRepo(input);

  // Log event
  await createEvent({
    event_type: 'investor.created',
    entity_type: 'investor',
    entity_id: investor.id,
    payload: {
      name: investor.name,
      jurisdiction: investor.jurisdiction,
      accredited: investor.accredited,
    },
  });

  return investor;
}

/**
 * Get investor by ID
 */
export async function getInvestor(id: string): Promise<Investor | null> {
  return await findInvestorById(id);
}

/**
 * Get all investors
 */
export async function getAllInvestors(): Promise<Investor[]> {
  return await findAllInvestors();
}

/**
 * Update investor
 */
export async function updateInvestor(
  id: string,
  input: UpdateInvestorInput
): Promise<Investor | null> {
  const investor = await updateInvestorRepo(id, input);

  if (!investor) {
    return null;
  }

  // Log event
  await createEvent({
    event_type: 'investor.updated',
    entity_type: 'investor',
    entity_id: investor.id,
    payload: {
      updated_fields: input,
    },
  });

  return investor;
}