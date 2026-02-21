import { ValidationError } from './errors.js';

export function requireNonEmpty(value: string, fieldName: string): void {
  if (!value.trim()) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

export function requirePositive(value: number, fieldName: string): void {
  if (value <= 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
}

export function requirePositiveIfPresent(
  value: number | undefined,
  fieldName: string
): void {
  if (value !== undefined && value <= 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
}
