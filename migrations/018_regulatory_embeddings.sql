-- Migration 018: Regulatory embeddings + metadata enhancements
-- Date: 2026-02-12
-- Description: Ensure regulatory_documents supports vector search and richer metadata.

-- Try to enable pgvector; skip gracefully if not available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector not available — skipping vector features';
END
$$;

ALTER TABLE regulatory_documents
  ADD COLUMN IF NOT EXISTS document_title VARCHAR(255),
  ALTER COLUMN chunk_index SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add vector column only if pgvector is installed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE regulatory_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);
        CREATE INDEX IF NOT EXISTS idx_regulatory_docs_embedding
          ON regulatory_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    ELSE
        RAISE NOTICE 'Skipping embedding column — pgvector not available';
    END IF;
END
$$;

-- Backfill document_title from legacy source_name when available.
UPDATE regulatory_documents
SET document_title = source_name
WHERE document_title IS NULL;

CREATE INDEX IF NOT EXISTS idx_regulatory_docs_tenant_title
  ON regulatory_documents (tenant_id, document_title);

-- Rollback notes:
-- DROP INDEX IF EXISTS idx_regulatory_docs_tenant_title;
-- DROP INDEX IF EXISTS idx_regulatory_docs_embedding;
