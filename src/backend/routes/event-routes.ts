import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  findAllEvents,
  findEventsByEntity,
  findEventsByType,
} from '../repositories/index.js';
import { EntityType, EventType } from '../models/index.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { entityType, entityId, eventType, limit } = req.query;

  if (entityType && entityId) {
    const events = await findEventsByEntity(
      entityType as EntityType,
      entityId as string
    );
    res.json(events);
    return;
  }

  if (eventType) {
    const events = await findEventsByType(eventType as EventType);
    res.json(events);
    return;
  }

  const parsedLimit = limit ? Number(limit) : 100;
  const eventLimit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 100 : Math.min(parsedLimit, 1000);
  const events = await findAllEvents(eventLimit);
  res.json(events);
}));

export default router;
