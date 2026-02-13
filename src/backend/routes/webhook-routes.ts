import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import {
  createWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
} from '../services/webhook-service.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['url']);
  const { url, event_types } = req.body;

  const webhook = await createWebhook(
    url,
    event_types || ['*'],
    req.user?.userId
  );
  res.status(201).json(webhook);
}));

router.get('/', asyncHandler(async (_req, res) => {
  const webhooks = await listWebhooks();
  res.json(webhooks);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { url, event_types, active } = req.body;
  await updateWebhook(req.params.id, { url, event_types, active });
  res.json({ status: 'updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await deleteWebhook(req.params.id);
  res.json({ status: 'deleted' });
}));

router.get('/:id/deliveries', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const deliveries = await getDeliveries(req.params.id, limit);
  res.json(deliveries);
}));

export default router;
