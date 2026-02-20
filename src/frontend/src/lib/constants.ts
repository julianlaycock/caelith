// ── Shared constants for dropdown options and domain values ──────────

export const ASSET_TYPES = [
  { value: 'Fund', label: 'Fund' },
  { value: 'LP Interest', label: 'LP Interest' },
  { value: 'SPV', label: 'SPV' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Private Equity', label: 'Private Equity' },
  { value: 'Other', label: 'Other' },
];

export const JURISDICTIONS = [
  { value: '', label: 'Select jurisdiction...' },
  { value: 'US', label: 'United States (US)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'CA', label: 'Canada (CA)' },
  { value: 'DE', label: 'Germany (DE)' },
  { value: 'FR', label: 'France (FR)' },
  { value: 'ES', label: 'Spain (ES)' },
  { value: 'IT', label: 'Italy (IT)' },
  { value: 'NL', label: 'Netherlands (NL)' },
  { value: 'IE', label: 'Ireland (IE)' },
  { value: 'LU', label: 'Luxembourg (LU)' },
  { value: 'JP', label: 'Japan (JP)' },
  { value: 'SG', label: 'Singapore (SG)' },
  { value: 'HK', label: 'Hong Kong (HK)' },
  { value: 'CH', label: 'Switzerland (CH)' },
  { value: 'AU', label: 'Australia (AU)' },
  { value: 'NO', label: 'Norway (NO)' },
];

export const ALL_JURISDICTIONS = [
  'US', 'GB', 'CA', 'DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'LU', 'JP', 'SG', 'HK', 'CH', 'AU', 'KR', 'BR', 'IN',
];

export const LEGAL_FORMS = [
  { value: '', label: 'Select...' },
  { value: 'SICAV', label: 'SICAV' },
  { value: 'SIF', label: 'SIF' },
  { value: 'RAIF', label: 'RAIF' },
  { value: 'SCSp', label: 'SCSp' },
  { value: 'SCA', label: 'SCA' },
  { value: 'ELTIF', label: 'ELTIF' },
  { value: 'Spezial_AIF', label: 'Spezial-AIF' },
  { value: 'Publikums_AIF', label: 'Publikums-AIF' },
  { value: 'QIAIF', label: 'QIAIF' },
  { value: 'RIAIF', label: 'RIAIF' },
  { value: 'LP', label: 'LP' },
  { value: 'other', label: 'Other' },
];

export const DOMICILES = [
  { value: '', label: 'Select...' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'IE', label: 'Ireland' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'SG', label: 'Singapore' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'NL', label: 'Netherlands' },
];

export const FRAMEWORKS = [
  { value: '', label: 'Select...' },
  { value: 'AIFMD', label: 'AIFMD' },
  { value: 'UCITS', label: 'UCITS' },
  { value: 'ELTIF', label: 'ELTIF' },
  { value: 'national', label: 'National' },
];

export const SFDR_CLASSIFICATIONS = [
  { value: 'not_classified', label: 'Not classified' },
  { value: 'article_6', label: 'Article 6 (No sustainability integration)' },
  { value: 'article_8', label: 'Article 8 (Promotes E/S characteristics)' },
  { value: 'article_9', label: 'Article 9 (Sustainable investment objective)' },
];

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' },
  { value: 'liquidating', label: 'Liquidating' },
];
