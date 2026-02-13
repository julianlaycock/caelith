export type FieldType = 'string' | 'boolean' | 'number';

export interface FieldDefinition {
  value: string;
  label: string;
  type: FieldType;
  operators: string[];
}

export const FIELDS: FieldDefinition[] = [
  { value: 'to.jurisdiction', label: 'Recipient jurisdiction', type: 'string', operators: ['eq', 'neq', 'in', 'not_in'] },
  { value: 'to.accredited', label: 'Recipient accredited', type: 'boolean', operators: ['eq'] },
  { value: 'to.investor_type', label: 'Recipient investor type', type: 'string', operators: ['eq', 'neq', 'in', 'not_in'] },
  { value: 'to.kyc_status', label: 'Recipient KYC status', type: 'string', operators: ['eq', 'neq'] },
  { value: 'from.jurisdiction', label: 'Sender jurisdiction', type: 'string', operators: ['eq', 'neq', 'in', 'not_in'] },
  { value: 'from.accredited', label: 'Sender accredited', type: 'boolean', operators: ['eq'] },
  { value: 'from.investor_type', label: 'Sender investor type', type: 'string', operators: ['eq', 'neq', 'in', 'not_in'] },
  { value: 'from.kyc_status', label: 'Sender KYC status', type: 'string', operators: ['eq', 'neq'] },
  { value: 'transfer.units', label: 'Transfer units', type: 'number', operators: ['gt', 'gte', 'lt', 'lte', 'eq'] },
  { value: 'transfer.amount', label: 'Transfer amount', type: 'number', operators: ['gt', 'gte', 'lt', 'lte', 'eq'] },
  { value: 'holding.units', label: 'Sender holding units', type: 'number', operators: ['gt', 'gte', 'lt', 'lte', 'eq'] },
];

export const OPERATOR_LABELS: Record<string, string> = {
  eq: '= equals',
  neq: '!= not equals',
  gt: '> greater than',
  gte: '>= greater or equal',
  lt: '< less than',
  lte: '<= less or equal',
  in: 'in (list)',
  not_in: 'not in (list)',
};

export function getFieldDef(fieldValue: string): FieldDefinition | undefined {
  return FIELDS.find((f) => f.value === fieldValue);
}
