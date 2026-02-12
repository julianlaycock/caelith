import { Router, Request, Response } from 'express';
import multer from 'multer';
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

  // POST /api/regulatory/ingest — admin only
  router.post('/ingest', authorize('admin'), upload.single('file'), async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing PDF file in multipart payload (field: file)',
        });
        return;
      }

      let metadataBody: Record<string, unknown> = {};
      if (typeof req.body.metadata === 'string' && req.body.metadata.trim()) {
        try {
          metadataBody = JSON.parse(req.body.metadata) as Record<string, unknown>;
        } catch {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'metadata must be valid JSON',
          });
          return;
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
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'documentTitle, jurisdiction, and framework are required',
        });
        return;
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
      return;
    } catch (err: unknown) {
      console.error('Regulatory ingest failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message,
      });
      return;
    }
  });

  // POST /api/regulatory/query
  router.post('/query', async (req: Request, res: Response): Promise<void> => {
    try {
      const question = typeof req.body.question === 'string' ? req.body.question : '';
      if (!question.trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'question is required',
        });
        return;
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
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message,
      });
      return;
    }
  });

  // POST /api/regulatory/suggest-rules
  router.post('/suggest-rules', async (req: Request, res: Response): Promise<void> => {
    try {
      const fundStructureId = typeof req.body.fundStructureId === 'string' ? req.body.fundStructureId : '';
      if (!fundStructureId.trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'fundStructureId is required',
        });
        return;
      }

      const suggestions = await ragService.suggestRules(
        fundStructureId,
        req.user?.tenantId || DEFAULT_TENANT_ID
      );

      res.status(200).json({ suggestions });
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: err.message,
        });
        return;
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message,
      });
      return;
    }
  });

  return router;
}

export default createRegulatoryRoutes;
