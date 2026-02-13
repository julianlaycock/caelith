import {
  createInvestor as createInvestorRepo,
  findInvestorById,
  findAllInvestors,
  updateInvestor as updateInvestorRepo,
  createEvent,
} from '../repositories/index.js';
import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';
import { ValidationError } from '../errors.js';

export async function createInvestor(input: CreateInvestorInput): Promise<Investor> {
  if (!input.name.trim()) {
    throw new ValidationError('Investor name cannot be empty');
  }

  if (!input.jurisdiction.trim()) {
    throw new ValidationError('Jurisdiction cannot be empty');
  }

  const investor = await createInvestorRepo(input);

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

export async function getInvestor(id: string): Promise<Investor | null> {
  return await findInvestorById(id);
}

export async function getAllInvestors(): Promise<Investor[]> {
  return await findAllInvestors();
}

export async function updateInvestor(
  id: string,
  input: UpdateInvestorInput
): Promise<Investor | null> {
  const investor = await updateInvestorRepo(id, input);

  if (!investor) {
    return null;
  }

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
