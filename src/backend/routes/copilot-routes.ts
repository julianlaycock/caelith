import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../errors.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { chat } from '../services/copilot-service.js';

export function createCopilotRoutes(): Router {
  const router = Router();

  router.post('/chat', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const message = typeof req.body.message === 'string' ? req.body.message : '';
    const context = typeof req.body.context === 'object' && req.body.context !== null
      ? req.body.context as { currentPage?: string; selectedEntityId?: string; selectedEntityType?: string }
      : undefined;

    if (!message.trim()) {
      throw new ValidationError('message is required');
    }

    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const response = await chat({ message, context }, tenantId, req.user?.userId);

    res.status(200).json(response);
  }));

  return router;
}

export default createCopilotRoutes;
