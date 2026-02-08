/**
 * Event Routes
 * 
 * Endpoints for audit trail
 */

import express from 'express';
import {
  findAllEvents,
  findEventsByEntity,
  findEventsByType,
} from '../repositories/index.js';
import { EntityType, EventType } from '../models/index.js';

const router = express.Router();

/**
 * GET /events
 * Get audit trail (with optional filters)
 */
router.get('/', async (req, res): Promise<void> => {
  try {
    const { entityType, entityId, eventType, limit } = req.query;

    // Filter by entity
    if (entityType && entityId) {
      const events = await findEventsByEntity(
        entityType as EntityType,
        entityId as string
      );
      res.json(events);
      return;
    }

    // Filter by event type
    if (eventType) {
      const events = await findEventsByType(eventType as EventType);
      res.json(events);
      return;
    }

    // Get all events (with limit)
    const eventLimit = limit ? Number(limit) : 100;
    const events = await findAllEvents(eventLimit);
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;