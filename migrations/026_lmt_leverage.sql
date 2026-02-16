ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS lmt_types JSONB DEFAULT '[]'::jsonb;
-- lmt_types: array of { type: string, description: string, threshold_pct: number?, active: boolean }
-- Valid LMT types per AIFMD II Art 16(2b): 'redemption_gate', 'notice_period', 'redemption_fee', 'swing_pricing', 'anti_dilution_levy', 'side_pocket', 'redemption_in_kind', 'suspension'

ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_limit_commitment DECIMAL(8,2);
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_limit_gross DECIMAL(8,2);
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_current_commitment DECIMAL(8,2);
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS leverage_current_gross DECIMAL(8,2);
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS liquidity_profile JSONB DEFAULT '[]'::jsonb;
-- liquidity_profile: array of { bucket: '1d', '2-7d', '8-30d', '31-90d', '91-180d', '181-365d', '>365d', pct: number }
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS geographic_exposure JSONB DEFAULT '[]'::jsonb;
-- geographic_exposure: array of { region: string, pct: number }
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS counterparty_exposure JSONB DEFAULT '[]'::jsonb;
-- counterparty_exposure: array of { name: string, lei: string?, exposure_pct: number }
