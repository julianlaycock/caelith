import { ValidationError, NotFoundError } from '../errors.js';

export function requireFields(
  body: Record<string, unknown>,
  fields: string[],
): void {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === '',
  );
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

export function requireFound<T>(
  value: T | null | undefined,
  entity: string,
  id: string,
): T {
  if (value === null || value === undefined) {
    throw new NotFoundError(entity, id);
  }
  return value;
}
