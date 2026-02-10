-- Migration 013: Regulatory Documents (RAG Pipeline)
-- Date: 2026-02-10
-- Description: Stores chunked, embedded regulatory text for AI-powered
--              regulatory intelligence queries. The embedding column requires
--              pgvector extension. If pgvector is not available, the table
--              is created without the embedding column and vector index.

-- ============================================================================
-- ENABLE PGVECTOR (optional — fails gracefully if not installed)
-- ============================================================================
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available — embedding column will be skipped';
END
$$;

-- ============================================================================
-- REGULATORY DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     VARCHAR(255) NOT NULL,
    jurisdiction    VARCHAR(10)  NOT NULL,
    framework       VARCHAR(50)  NOT NULL,
    article_ref     VARCHAR(100),
    chunk_index     INTEGER      NOT NULL,
    content         TEXT         NOT NULL,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_rd_source_chunk UNIQUE (source_name, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_rd_jurisdiction ON regulatory_documents(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_rd_framework ON regulatory_documents(framework);

-- ============================================================================
-- ADD VECTOR COLUMN (only if pgvector is available)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE regulatory_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);
        CREATE INDEX IF NOT EXISTS idx_rd_embedding ON regulatory_documents
            USING hnsw (embedding vector_cosine_ops);
        RAISE NOTICE 'embedding column and HNSW index created';
    ELSE
        RAISE NOTICE 'Skipping embedding column — install pgvector to enable semantic search';
    END IF;
END
$$;

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_rd_embedding;
-- DROP INDEX IF EXISTS idx_rd_framework;
-- DROP INDEX IF EXISTS idx_rd_jurisdiction;
-- DROP TABLE IF EXISTS regulatory_documents;
-- DROP EXTENSION IF EXISTS vector;