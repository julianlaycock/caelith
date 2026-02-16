ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_date DATE;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_evidence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS classification_method VARCHAR(50);
-- classification_method: 'self_declaration', 'documentation', 'professional_assessment', 'regulatory_status'
-- classification_evidence: array of { type: string, document_ref: string, verified_at: string, verified_by: string }
