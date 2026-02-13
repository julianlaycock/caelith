import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFound } from '../middleware/validate.js';

const router = Router();

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  jurisdiction: string[];
  rules: {
    qualification_required: boolean;
    lockup_days: number;
    jurisdiction_whitelist: string[];
  };
  composite_rules: Array<{
    name: string;
    description: string;
    operator: 'AND' | 'OR' | 'NOT';
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  }>;
}

const EU_MEMBER_STATES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
];

const EEA_STATES = [...EU_MEMBER_STATES, 'IS', 'LI', 'NO'];

const TEMPLATES: RuleTemplate[] = [
  {
    id: 'mifid2-professional',
    name: 'MiFID II — Professional Investors Only',
    description: 'Restricts transfers to qualified/professional investors within the EEA. Suitable for funds and structured products marketed under MiFID II professional client classification.',
    framework: 'MiFID II',
    jurisdiction: EEA_STATES,
    rules: {
      qualification_required: true,
      lockup_days: 0,
      jurisdiction_whitelist: EEA_STATES,
    },
    composite_rules: [
      {
        name: 'EEA professional recipients',
        description: 'Receiver must be an accredited investor in an EEA jurisdiction',
        operator: 'AND',
        conditions: [
          { field: 'to.accredited', operator: 'eq', value: true },
          { field: 'to.jurisdiction', operator: 'in', value: EEA_STATES },
        ],
      },
    ],
  },
  {
    id: 'mifid2-retail',
    name: 'MiFID II — Retail Eligible',
    description: 'Allows transfers to both retail and professional investors within the EEA. Includes a 7-day cooling-off lockup period.',
    framework: 'MiFID II',
    jurisdiction: EEA_STATES,
    rules: {
      qualification_required: false,
      lockup_days: 7,
      jurisdiction_whitelist: EEA_STATES,
    },
    composite_rules: [
      {
        name: 'EEA jurisdiction restriction',
        description: 'Both sender and receiver must be in EEA jurisdictions',
        operator: 'AND',
        conditions: [
          { field: 'from.jurisdiction', operator: 'in', value: EEA_STATES },
          { field: 'to.jurisdiction', operator: 'in', value: EEA_STATES },
        ],
      },
    ],
  },
  {
    id: 'aifmd-qualified',
    name: 'AIFMD — Qualified Investors',
    description: 'Alternative Investment Fund Managers Directive compliance. Professional investors with 90-day lockup. For PE/VC, real estate funds, and hedge funds in the EU.',
    framework: 'AIFMD',
    jurisdiction: EEA_STATES,
    rules: {
      qualification_required: true,
      lockup_days: 90,
      jurisdiction_whitelist: EEA_STATES,
    },
    composite_rules: [
      {
        name: 'Qualified investor gate',
        description: 'Receiver must be accredited (professional investor classification)',
        operator: 'AND',
        conditions: [
          { field: 'to.accredited', operator: 'eq', value: true },
        ],
      },
      {
        name: 'Minimum transfer size',
        description: 'Minimum 100-unit threshold for AIFMD compliance',
        operator: 'AND',
        conditions: [
          { field: 'transfer.units', operator: 'gte', value: 100 },
        ],
      },
    ],
  },
  {
    id: 'dlt-pilot',
    name: 'EU DLT Pilot Regime',
    description: 'For tokenized securities under EU DLT Pilot Regime (Regulation 2022/858). EU member state jurisdiction restrictions with 30-day settlement lockup.',
    framework: 'DLT Pilot Regime',
    jurisdiction: EU_MEMBER_STATES,
    rules: {
      qualification_required: true,
      lockup_days: 30,
      jurisdiction_whitelist: EU_MEMBER_STATES,
    },
    composite_rules: [
      {
        name: 'EU-only transfers',
        description: 'Both parties must be in EU member states',
        operator: 'AND',
        conditions: [
          { field: 'from.jurisdiction', operator: 'in', value: EU_MEMBER_STATES },
          { field: 'to.jurisdiction', operator: 'in', value: EU_MEMBER_STATES },
        ],
      },
      {
        name: 'DLT qualified participants',
        description: 'Both parties must meet professional investor criteria',
        operator: 'AND',
        conditions: [
          { field: 'to.accredited', operator: 'eq', value: true },
          { field: 'from.accredited', operator: 'eq', value: true },
        ],
      },
    ],
  },
  {
    id: 'mica-crypto-asset',
    name: 'MiCA — Crypto-Asset Service Provider',
    description: 'Markets in Crypto-Assets Regulation compliance. No qualification gate for retail, 14-day right-of-withdrawal lockup. For CASPs operating under MiCA.',
    framework: 'MiCA',
    jurisdiction: EU_MEMBER_STATES,
    rules: {
      qualification_required: false,
      lockup_days: 14,
      jurisdiction_whitelist: EU_MEMBER_STATES,
    },
    composite_rules: [
      {
        name: 'EU member state restriction',
        description: 'Transfers restricted to EU member states under MiCA scope',
        operator: 'AND',
        conditions: [
          { field: 'to.jurisdiction', operator: 'in', value: EU_MEMBER_STATES },
        ],
      },
    ],
  },
  {
    id: 'dach-private-placement',
    name: 'DACH Region — Private Placement',
    description: 'Private placement for Germany, Austria, and Switzerland. Professional investors only with 180-day lockup. For private debt, real estate tokens, and SPV interests.',
    framework: 'National (DE/AT/CH)',
    jurisdiction: ['DE', 'AT', 'CH'],
    rules: {
      qualification_required: true,
      lockup_days: 180,
      jurisdiction_whitelist: ['DE', 'AT', 'CH'],
    },
    composite_rules: [
      {
        name: 'DACH professional investors',
        description: 'Restricted to accredited investors in DE, AT, or CH',
        operator: 'AND',
        conditions: [
          { field: 'to.accredited', operator: 'eq', value: true },
          { field: 'to.jurisdiction', operator: 'in', value: ['DE', 'AT', 'CH'] },
        ],
      },
    ],
  },
];

router.get('/', (_req: Request, res: Response): void => {
  const summaries = TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    framework: t.framework,
    jurisdiction_count: t.jurisdiction.length,
    composite_rule_count: t.composite_rules.length,
  }));
  res.json(summaries);
});

router.get('/:id', asyncHandler(async (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.id);
  requireFound(template, 'Template', req.params.id);
  res.json(template);
}));

export default router;
