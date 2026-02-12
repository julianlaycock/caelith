-- Migration 018: Regulatory embeddings + metadata enhancements
-- Date: 2026-02-12
-- Description: Ensure regulatory_documents supports vector search and richer metadata.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE regulatory_documents
  ADD COLUMN IF NOT EXISTS document_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ALTER COLUMN chunk_index SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Backfill document_title from legacy source_name when available.
UPDATE regulatory_documents
SET document_title = source_name
WHERE document_title IS NULL;

CREATE INDEX IF NOT EXISTS idx_regulatory_docs_embedding
  ON regulatory_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_regulatory_docs_tenant_title
  ON regulatory_documents (tenant_id, document_title);

-- Rollback notes:
-- DROP INDEX IF EXISTS idx_regulatory_docs_tenant_title;
-- DROP INDEX IF EXISTS idx_regulatory_docs_embedding;
