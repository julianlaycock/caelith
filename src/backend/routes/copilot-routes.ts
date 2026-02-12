import { Router, Request, Response } from 'express';
import { DEFAULT_TENANT_ID } from '../db.js';
import { chat } from '../services/copilot-service.js';

export function createCopilotRoutes(): Router {
  const router = Router();

  // POST /api/copilot/chat
  router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      const message = typeof req.body.message === 'string' ? req.body.message : '';
      const context = typeof req.body.context === 'object' && req.body.context !== null
        ? req.body.context as { currentPage?: string; selectedEntityId?: string; selectedEntityType?: string }
        : undefined;

      if (!message.trim()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'message is required',
        });
        return;
      }

      const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
      const response = await chat({ message, context }, tenantId, req.user?.userId);

      res.status(200).json(response);
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json({
          error: 'RATE_LIMITED',
          message: 'Copilot query limit reached (20 per hour). Try again later.',
        });
        return;
      }

      if (err instanceof Error && err.message === 'VALIDATION_ERROR') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'message must be a non-empty string',
        });
        return;
      }

      console.error('Copilot chat error:', err);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Something went wrong while processing the copilot request.',
      });
      return;
    }
  });

  return router;
}

export default createCopilotRoutes;
