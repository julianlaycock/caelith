export const TEST_ASSETS = {
  growthFund: {
    name: 'Growth Fund I',
    asset_type: 'Fund',
    total_units: 1000000,
  },
  realEstate: {
    name: 'RE Holdings LP',
    asset_type: 'Real Estate',
    total_units: 500000,
  },
};

export const TEST_INVESTORS = {
  alice: {
    name: 'Alice Johnson',
    jurisdiction: 'US',
    accredited: true,
  },
  bob: {
    name: 'Bob Smith',
    jurisdiction: 'GB',
    accredited: true,
  },
  charlie: {
    name: 'Charlie Wang',
    jurisdiction: 'CN',
    accredited: false,
  },
  diana: {
    name: 'Diana Mueller',
    jurisdiction: 'DE',
    accredited: true,
  },
  eve: {
    name: 'Eve Tanaka',
    jurisdiction: 'JP',
    accredited: true,
  },
};

export const TEST_RULES = {
  standard: {
    qualification_required: true,
    lockup_days: 90,
    jurisdiction_whitelist: ['US', 'GB', 'DE', 'JP'],
    transfer_whitelist: null,
  },
  restrictive: {
    qualification_required: true,
    lockup_days: 365,
    jurisdiction_whitelist: ['US'],
    transfer_whitelist: [] as string[], // will be filled with specific IDs
  },
};

export const API_BASE = 'http://localhost:3001/api';