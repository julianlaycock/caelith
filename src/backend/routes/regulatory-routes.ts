import { Router, Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError, NotFoundError } from '../errors.js';
import { ragService } from '../services/rag-service.js';
import { authorize } from '../middleware/auth.js';
import { DEFAULT_TENANT_ID } from '../db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

interface RegulatoryQueryFilters {
  jurisdiction?: string;
  framework?: string;
  documentTitle?: string;
}

export function createRegulatoryRoutes(): Router {
  const router = Router();

  router.post('/ingest', authorize('admin'), upload.single('file'), asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new ValidationError('Missing PDF file in multipart payload (field: file)');
    }

    let metadataBody: Record<string, unknown> = {};
    if (typeof req.body.metadata === 'string' && req.body.metadata.trim()) {
      try {
        metadataBody = JSON.parse(req.body.metadata) as Record<string, unknown>;
      } catch {
        throw new ValidationError('metadata must be valid JSON');
      }
    }

    const documentTitle =
      (metadataBody.documentTitle as string | undefined)
      || (typeof req.body.documentTitle === 'string' ? req.body.documentTitle : undefined)
      || req.file.originalname;

    const jurisdiction =
      (metadataBody.jurisdiction as string | undefined)
      || (typeof req.body.jurisdiction === 'string' ? req.body.jurisdiction : undefined);

    const framework =
      (metadataBody.framework as string | undefined)
      || (typeof req.body.framework === 'string' ? req.body.framework : undefined);

    if (!documentTitle || !jurisdiction || !framework) {
      throw new ValidationError('documentTitle, jurisdiction, and framework are required');
    }

    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const metadata = {
      ...metadataBody,
      uploaded_by: req.user?.userId,
    };

    const result = await ragService.ingestDocument(req.file.buffer, {
      documentTitle,
      jurisdiction,
      framework,
      tenantId,
      metadata,
    });

    res.status(201).json({
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
    });
  }));

  router.post('/query', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const question = typeof req.body.question === 'string' ? req.body.question : '';
    if (!question.trim()) {
      throw new ValidationError('question is required');
    }

    const filters = (req.body.filters || {}) as RegulatoryQueryFilters;
    const topK = typeof req.body.topK === 'number' ? req.body.topK : undefined;

    const results = await ragService.query(question, {
      tenantId: req.user?.tenantId || DEFAULT_TENANT_ID,
      jurisdiction: filters.jurisdiction,
      framework: filters.framework,
      documentTitle: filters.documentTitle,
      topK,
    });

    res.status(200).json({
      results,
      query: question,
    });
  }));

  router.post('/suggest-rules', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const fundStructureId = typeof req.body.fundStructureId === 'string' ? req.body.fundStructureId : '';
    if (!fundStructureId.trim()) {
      throw new ValidationError('fundStructureId is required');
    }

    try {
      const suggestions = await ragService.suggestRules(
        fundStructureId,
        req.user?.tenantId || DEFAULT_TENANT_ID
      );
      res.status(200).json({ suggestions });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw new NotFoundError('Fund structure', fundStructureId);
      }
      throw err;
    }
  }));

  return router;
}

export default createRegulatoryRoutes;
