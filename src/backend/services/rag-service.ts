import { randomUUID } from 'crypto';
import { DEFAULT_TENANT_ID, query } from '../db.js';
import { createEmbeddingService, EmbeddingService } from './embedding-service.js';
import type { RuleCondition } from '../../rules-engine/types.js';
import { NotFoundError } from '../errors.js';

const ARTICLE_PATTERNS = [/Art(?:icle)?\s*\d+[A-Za-z0-9.-]*/i, /Section\s*\d+[A-Za-z0-9.-]*/i, /Chapter\s*\d+[A-Za-z0-9.-]*/i];
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const STORAGE_VECTOR_DIMENSIONS = 1536;

export interface DocumentMetadata {
  documentTitle: string;
  jurisdiction: string;
  framework: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  totalTokensEstimated: number;
}

export interface QueryFilters {
  jurisdiction?: string;
  framework?: string;
  documentTitle?: string;
  topK?: number;
  similarityThreshold?: number;
  tenantId?: string;
}

export interface RagResult {
  id: string;
  content: string;
  documentTitle: string;
  articleRef: string | null;
  jurisdiction: string;
  framework: string;
  similarity: number;
}

export interface RuleSuggestion {
  name: string;
  description: string;
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
  citations: string[];
  confidence: number;
}

interface Chunk {
  content: string;
  articleRef: string | null;
  chunkIndex: number;
}

interface RegulatoryDocumentRow {
  id: string;
  document_title: string | null;
  source_name: string | null;
  article_ref: string | null;
  content: string;
  jurisdiction: string;
  framework: string;
  similarity: number;
}

interface FundStructureLookup {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  regulatory_framework: string;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
}

function estimateTokens(input: string): number {
  const words = input.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

function extractArticleRef(input: string): string | null {
  for (const pattern of ARTICLE_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

function chunkByHeaders(text: string): Chunk[] {
  const lines = text
    .split(/\n+/)
    .map(line => normalizeWhitespace(line))
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let currentLines: string[] = [];
  let currentHeader: string | null = null;

  const flush = (): void => {
    if (currentLines.length === 0) {
      return;
    }

    const content = normalizeWhitespace(currentLines.join(' '));
    if (content) {
      chunks.push({
        content,
        articleRef: currentHeader,
        chunkIndex: chunks.length,
      });
    }

    currentLines = [];
  };

  for (const line of lines) {
    const header = extractArticleRef(line);
    if (header && currentLines.length > 0) {
      flush();
    }

    if (header) {
      currentHeader = header;
    }

    currentLines.push(line);
  }

  flush();
  return chunks;
}

function chunkByTokenWindow(text: string): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const windowSize = 500;
  const overlap = 50;
  const step = windowSize - overlap;

  const chunks: Chunk[] = [];
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + windowSize).join(' ');
    if (!slice) {
      continue;
    }

    chunks.push({
      content: normalizeWhitespace(slice),
      articleRef: extractArticleRef(slice),
      chunkIndex: chunks.length,
    });
  }

  return chunks;
}

function toPgVector(values: number[]): string {
  const cleaned = values.map(value => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Number(value.toFixed(8));
  });
  return `[${cleaned.join(',')}]`;
}

function normalizeEmbeddingForStorage(values: number[]): number[] {
  if (values.length === STORAGE_VECTOR_DIMENSIONS) {
    return values;
  }

  if (values.length > STORAGE_VECTOR_DIMENSIONS) {
    return values.slice(0, STORAGE_VECTOR_DIMENSIONS);
  }

  return [...values, ...new Array(STORAGE_VECTOR_DIMENSIONS - values.length).fill(0)];
}

function getSimilarityThreshold(filters?: QueryFilters): number {
  if (typeof filters?.similarityThreshold === 'number') {
    return filters.similarityThreshold;
  }

  const envThreshold = Number(process.env.RAG_SIMILARITY_THRESHOLD ?? 0.5);
  return Number.isFinite(envThreshold) ? envThreshold : 0.5;
}

export class RagService {
  constructor(private readonly embeddingService: EmbeddingService = createEmbeddingService()) {}

  async ingestDocument(buffer: Buffer, metadata: DocumentMetadata): Promise<IngestResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Upload payload is empty');
    }

    // Reject raw PDF binaries — use ingestText() with pre-extracted text instead
    if (buffer[0] === 0x25 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      throw new Error(
        'PDF binary ingestion is not supported. Use ingestText() with pre-extracted text, or convert to text first.'
      );
    }

    const text = normalizeWhitespace(buffer.toString('utf-8'));
    return this.ingestText(text, metadata);
  }

  async ingestText(text: string, metadata: DocumentMetadata): Promise<IngestResult> {
    const normalized = normalizeWhitespace(text);
    if (!normalized) { throw new Error('No text content provided'); }
    const headerChunks = chunkByHeaders(normalized);
    const rawChunks = headerChunks.length >= 2 ? headerChunks : chunkByTokenWindow(normalized);
    const chunks = rawChunks
      .map((chunk, index) => ({ ...chunk, chunkIndex: index, content: chunk.content.slice(0, 10_000) }))
      .filter(chunk => chunk.content.length > 0);
    if (chunks.length === 0) { throw new Error('Document chunking produced no content'); }
    const tenantId = metadata.tenantId || DEFAULT_TENANT_ID;
    const baseMetadata = metadata.metadata || {};
    const documentId = randomUUID();
    let firstChunkId = documentId;
    const batchSize = 8;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await this.embeddingService.embedBatch(batch.map(c => c.content));
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const rawEmb = embeddings[j] || [];
        const normEmb = normalizeEmbeddingForStorage(rawEmb);
        const chunkId = randomUUID();
        await query(
          `INSERT INTO regulatory_documents
            (id, source_name, document_title, jurisdiction, framework, article_ref,
             chunk_index, content, metadata, embedding, tenant_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::vector, $11, now())`,
          [chunkId, metadata.documentTitle, metadata.documentTitle, metadata.jurisdiction,
           metadata.framework, chunk.articleRef || null, chunk.chunkIndex, chunk.content,
           JSON.stringify(baseMetadata), '[' + normEmb.join(',') + ']', tenantId]
        );
        if (i === 0 && j === 0) firstChunkId = chunkId;
      }
    }
    const totalTokensEstimated = chunks.reduce((sum, c) => sum + estimateTokens(c.content), 0);
    return { documentId: firstChunkId, chunksCreated: chunks.length, totalTokensEstimated };
  }

  async query(question: string, filters?: QueryFilters): Promise<RagResult[]> {
    const cleanedQuestion = normalizeWhitespace(question);
    if (!cleanedQuestion) {
      return [];
    }

    const tenantId = filters?.tenantId || DEFAULT_TENANT_ID;
    const requestedTopK = typeof filters?.topK === 'number' ? filters.topK : DEFAULT_TOP_K;
    const topK = Math.max(1, Math.min(MAX_TOP_K, requestedTopK));

    const questionEmbedding = await this.embeddingService.embed(cleanedQuestion);
    const normalizedEmbedding = normalizeEmbeddingForStorage(questionEmbedding);
    const embeddingVector = toPgVector(normalizedEmbedding);

    const whereClauses = ['tenant_id = $2', 'embedding IS NOT NULL'];
    const params: (string | number)[] = [embeddingVector, tenantId];
    let paramIndex = 3;

    if (filters?.jurisdiction) {
      whereClauses.push(`jurisdiction = $${paramIndex++}`);
      params.push(filters.jurisdiction);
    }

    if (filters?.framework) {
      whereClauses.push(`framework = $${paramIndex++}`);
      params.push(filters.framework);
    }

    if (filters?.documentTitle) {
      whereClauses.push(`COALESCE(document_title, source_name) ILIKE $${paramIndex++}`);
      params.push(`%${filters.documentTitle}%`);
    }

    params.push(topK * 3);

    const rows = await query<RegulatoryDocumentRow>(
      `SELECT id,
              document_title,
              source_name,
              article_ref,
              content,
              jurisdiction,
              framework,
              1 - (embedding <=> $1::vector) AS similarity
       FROM regulatory_documents
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY embedding <=> $1::vector
       LIMIT $${paramIndex}`,
      params
    );

    const threshold = getSimilarityThreshold(filters);

    return rows
      .filter(row => Number(row.similarity) > threshold)
      .slice(0, topK)
      .map(row => ({
        id: row.id,
        content: row.content,
        documentTitle: row.document_title || row.source_name || 'Untitled document',
        articleRef: row.article_ref,
        jurisdiction: row.jurisdiction,
        framework: row.framework,
        similarity: Number(row.similarity),
      }));
  }

  async suggestRules(fundStructureId: string, tenantId = DEFAULT_TENANT_ID): Promise<RuleSuggestion[]> {
    const funds = await query<FundStructureLookup>(
      `SELECT id, name, legal_form, domicile, regulatory_framework
       FROM fund_structures
       WHERE id = $1 AND tenant_id = $2`,
      [fundStructureId, tenantId]
    );

    const fund = funds[0];
    if (!fund) {
      throw new NotFoundError('Fund structure', fundStructureId);
    }

    const ragResults = await this.query(
      `What are the investor eligibility requirements for ${fund.legal_form} funds in ${fund.domicile}? Include investor categories and minimum investment requirements.`,
      {
        tenantId,
        jurisdiction: fund.domicile,
        framework: fund.regulatory_framework,
        topK: 6,
      }
    );

    if (ragResults.length === 0) {
      return [];
    }

    const mergedText = ragResults.map(result => result.content).join(' ').toLowerCase();
    const citations = ragResults
      .slice(0, 3)
      .map(result => `${result.documentTitle}${result.articleRef ? `, ${result.articleRef}` : ''}`);

    const suggestions: RuleSuggestion[] = [];

    if (/well[-\s]informed|professional|institutional/.test(mergedText)) {
      suggestions.push({
        name: `${fund.legal_form} eligible investor gate`,
        description: `Restrict ${fund.name} to eligible investor categories and block retail recipients.`,
        operator: 'AND',
        conditions: [
          { field: 'fund.legal_form', operator: 'eq', value: fund.legal_form },
          { field: 'to.investor_type', operator: 'not_in', value: ['retail'] },
        ],
        citations,
        confidence: 0.84,
      });
    }

    if (/125\s?000|125,000|125\.000|minimum investment/.test(mergedText)) {
      suggestions.push({
        name: `${fund.legal_form} semi-professional floor`,
        description: 'Flag semi-professional investor allocations that should be reviewed against minimum commitment requirements.',
        operator: 'AND',
        conditions: [
          { field: 'fund.legal_form', operator: 'eq', value: fund.legal_form },
          { field: 'to.investor_type', operator: 'eq', value: 'semi_professional' },
        ],
        citations,
        confidence: 0.72,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        name: `${fund.legal_form} eligibility baseline`,
        description: 'Apply a baseline eligibility gate and review investor classification against source requirements.',
        operator: 'AND',
        conditions: [
          { field: 'fund.legal_form', operator: 'eq', value: fund.legal_form },
        ],
        citations,
        confidence: 0.6,
      });
    }

    return suggestions;
  }
}

export const ragService = new RagService();
