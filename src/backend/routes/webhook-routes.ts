/**
 * Webhook Routes
 *
 * CRUD for webhook registrations + delivery history
 */

import express from 'express';
import {
  createWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
} from '../services/webhook-service.js';

const router = express.Router();

/**
 * POST /webhooks
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const { url, event_types } = req.body;

    if (!url) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required field: url',
      });
      return;
    }

    const webhook = await createWebhook(
      url,
      event_types || ['*'],
      req.user?.userId
    );
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /webhooks
 */
router.get('/', async (_req, res): Promise<void> => {
  try {
    const webhooks = await listWebhooks();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /webhooks/:id
 */
router.patch('/:id', async (req, res): Promise<void> => {
  try {
    const { url, event_types, active } = req.body;
    await updateWebhook(req.params.id, { url, event_types, active });
    res.json({ status: 'updated' });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /webhooks/:id
 */
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    await deleteWebhook(req.params.id);
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /webhooks/:id/deliveries
 */
router.get('/:id/deliveries', async (req, res): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const deliveries = await getDeliveries(req.params.id, limit);
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;