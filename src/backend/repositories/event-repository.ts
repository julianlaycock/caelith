import { randomUUID } from 'crypto';
import { query, execute, parseJSON, stringifyJSON, queryWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import { Event, CreateEventInput, EventType, EntityType } from '../models/index.js';
import { dispatchEvent } from '../services/webhook-service.js';

/**
 * Event Repository - Handles all database operations for audit events
 */

interface EventRow {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: string;
  timestamp: string;
}

/**
 * Convert database row to Event
 */
function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    event_type: row.event_type as EventType,
    entity_type: row.entity_type as EntityType,
    entity_id: row.entity_id,
    payload: parseJSON<Record<string, unknown>>(row.payload) || {},
    timestamp: row.timestamp,
  };
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO events (id, tenant_id, event_type, entity_type, entity_id, payload, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_TENANT_ID,
      input.event_type,
      input.entity_type,
      input.entity_id,
      stringifyJSON(input.payload),
      now,
    ]
  );

  const event: Event = {
    id,
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    payload: input.payload,
    timestamp: now,
  };

  // Fire webhooks (non-blocking)
  dispatchEvent(input.event_type, {
    ...input.payload,
    event_id: id,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  }).catch((err) => {
    console.error('[webhook] Dispatch failed for event', id, ':', err instanceof Error ? err.message : err);
  });

  return event;
}

/**
 * Find event by ID
 */
export async function findEventById(id: string): Promise<Event | null> {
  const results = await queryWithTenant<EventRow>('SELECT * FROM events WHERE id = ?', [id]);

  return results.length > 0 ? rowToEvent(results[0]) : null;
}

/**
 * Find all events for an entity
 */
export async function findEventsByEntity(entityType: EntityType, entityId: string): Promise<Event[]> {
  const results = await queryWithTenant<EventRow>(
    'SELECT * FROM events WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp DESC',
    [entityType, entityId]
  );

  return results.map(rowToEvent);
}

/**
 * Find events by type
 */
export async function findEventsByType(eventType: EventType): Promise<Event[]> {
  const results = await queryWithTenant<EventRow>(
    'SELECT * FROM events WHERE event_type = ? ORDER BY timestamp DESC',
    [eventType]
  );

  return results.map(rowToEvent);
}

/**
 * Find all events (audit trail)
 */
export async function findAllEvents(limit: number = 100): Promise<Event[]> {
  const results = await queryWithTenant<EventRow>(
    'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );

  return results.map(rowToEvent);
}

/**
 * Find events within a date range
 */
export async function findEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
  const results = await queryWithTenant<EventRow>(
    'SELECT * FROM events WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
    [startDate, endDate]
  );

  return results.map(rowToEvent);
}