/**
 * Ingest Regulatory Documents — Bulk PDF ingestion for RAG pipeline
 *
 * Usage: npx tsx scripts/ingest-regulations.ts
 *
 * Reads PDF files from a configured directory and ingests them into
 * the regulatory_documents table with vector embeddings.
 *
 * Idempotent: checks if document already exists by title before ingesting.
 */

import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { query, closeDb, DEFAULT_TENANT_ID } from '../src/backend/db.js';
import { RagService } from '../src/backend/services/rag-service.js';

interface DocumentSpec {
  filename: string;
  documentTitle: string;
  jurisdiction: string;
  framework: string;
  metadata?: Record<string, unknown>;
}

const DOCUMENTS: DocumentSpec[] = [
  {
    filename: 'CELEX_32011L0061_EN_TXT.txt',
    documentTitle: 'AIFMD Directive 2011/61/EU',
    jurisdiction: 'EU',
    framework: 'AIFMD',
  },
  {
    filename: 'CELEX_32023R0606_EN_TXT.txt',
    documentTitle: 'ELTIF 2.0 Regulation (EU) 2023/606',
    jurisdiction: 'EU',
    framework: 'ELTIF',
  },
  {
    filename: 'cssf15_633eng.txt',
    documentTitle: 'CSSF Circular 15/633',
    jurisdiction: 'LU',
    framework: 'AIFMD',
    metadata: {
      note: 'Financial reporting circular — NOT investor eligibility. Included for corpus completeness.',
    },
  },
  {
    filename: 'cssf18_698eng.txt',
    documentTitle: 'CSSF Circular 18/698',
    jurisdiction: 'LU',
    framework: 'AIFMD',
  },
  {
    filename: 'L_230716_RAIF_eng.txt',
    documentTitle: 'RAIF Law 23 Jul 2016',
    jurisdiction: 'LU',
    framework: 'AIFMD',
  },
  {
    filename: 'CBI_AIFMD_QA.txt',
    documentTitle: 'CBI AIFMD Q&A',
    jurisdiction: 'IE',
    framework: 'AIFMD',
  },
];

// Search paths for PDF files
const SEARCH_DIRS = [
  '/mnt/project',
  resolve(process.cwd(), 'docs', 'regulations'),
  resolve(process.cwd(), 'data', 'regulations'),
  resolve(process.cwd(), 'pdfs'),
  process.cwd(),
];

function findPdf(filename: string): string | null {
  for (const dir of SEARCH_DIRS) {
    const fullPath = resolve(dir, filename);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function isAlreadyIngested(documentTitle: string): Promise<boolean> {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM regulatory_documents
     WHERE (document_title = $1 OR source_name = $1)
       AND tenant_id = $2`,
    [documentTitle, DEFAULT_TENANT_ID]
  );
  return (rows[0]?.count || 0) > 0;
}

async function main() {
  console.log('=== Caelith Regulatory Document Ingestion ===\n');

  const ragService = new RagService();
  let ingested = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const doc = DOCUMENTS[i];
    const label = `[${i + 1}/${DOCUMENTS.length}]`;

    // Check idempotency
    const alreadyExists = await isAlreadyIngested(doc.documentTitle);
    if (alreadyExists) {
      console.log(`${label} SKIP: "${doc.documentTitle}" already ingested.`);
      skipped++;
      continue;
    }

    // Find PDF file
    const pdfPath = findPdf(doc.filename);
    if (!pdfPath) {
      console.warn(`${label} WARN: "${doc.filename}" not found in search paths. Skipping.`);
      failed++;
      continue;
    }

    try {
      console.log(`${label} Ingesting "${doc.documentTitle}" from ${pdfPath}...`);
      const textContent = readFileSync(pdfPath, 'utf-8');

      const result = await ragService.ingestText(textContent, {
        documentTitle: doc.documentTitle,
        jurisdiction: doc.jurisdiction,
        framework: doc.framework,
        tenantId: DEFAULT_TENANT_ID,
        metadata: doc.metadata,
      });

      console.log(`${label} OK: ${result.chunksCreated} chunks created (~${result.totalTokensEstimated} tokens)`);
      ingested++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${label} ERROR: Failed to ingest "${doc.documentTitle}": ${message}`);
      failed++;
    }
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`  Ingested: ${ingested}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${DOCUMENTS.length}`);

  await closeDb();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
