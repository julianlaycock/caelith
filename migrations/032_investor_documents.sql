-- Migration 032: Investor Documents — KYC Document Upload & Management
-- Stores file metadata and binary content for investor KYC documents.

CREATE TABLE IF NOT EXISTS investor_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    document_type VARCHAR(100) NOT NULL
        CHECK (document_type IN (
            'KYC_identity', 'proof_of_address', 'proof_of_institutional_status',
            'MiFID_professional_classification', 'written_confirmation_of_well_informed_status',
            'proof_of_experience', 'qualifying_investor_declaration',
            'semi_professional_declaration', 'suitability_questionnaire',
            'subscription_agreement', 'prospectus_acknowledgement',
            'tax_declaration', 'AML_screening', 'source_of_funds',
            'beneficial_ownership', 'other'
        )),
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    file_data BYTEA NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'verified', 'rejected', 'expired')),
    expiry_date DATE,
    notes TEXT,
    uploaded_by UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_doc_investor ON investor_documents(investor_id);
CREATE INDEX IF NOT EXISTS idx_inv_doc_type ON investor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_inv_doc_status ON investor_documents(status);
CREATE INDEX IF NOT EXISTS idx_inv_doc_tenant ON investor_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_doc_expiry ON investor_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- RLS policy
ALTER TABLE investor_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_investor_documents') THEN
    CREATE POLICY tenant_isolation_investor_documents ON investor_documents
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
