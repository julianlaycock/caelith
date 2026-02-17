import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { ValidationError } from '../errors.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { chat } from '../services/copilot-service.js';
import { createEvent } from '../repositories/event-repository.js';

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

  router.post('/feedback', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { messageId, rating } = req.body as { messageId?: string; rating?: string };

    if (!messageId || typeof messageId !== 'string') {
      throw new ValidationError('messageId is required');
    }
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(messageId)) {
      throw new ValidationError('Invalid messageId format');
    }
    if (rating !== 'up' && rating !== 'down') {
      throw new ValidationError('rating must be "up" or "down"');
    }

    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;

    await createEvent({
      event_type: 'copilot.feedback',
      entity_type: 'system',
      entity_id: messageId,
      payload: {
        rating,
        userId: req.user?.userId,
        tenant_id: tenantId,
      },
    });

    res.status(200).json({ ok: true });
  }));

  return router;
}

export default createCopilotRoutes;
