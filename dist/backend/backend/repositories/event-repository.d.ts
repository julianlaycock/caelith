import { Event, CreateEventInput, EventType, EntityType } from '../models/index.js';
/**
 * Create a new event
 */
export declare function createEvent(input: CreateEventInput): Promise<Event>;
/**
 * Find event by ID
 */
export declare function findEventById(id: string): Promise<Event | null>;
/**
 * Find all events for an entity
 */
export declare function findEventsByEntity(entityType: EntityType, entityId: string): Promise<Event[]>;
/**
 * Find events by type
 */
export declare function findEventsByType(eventType: EventType): Promise<Event[]>;
/**
 * Find all events (audit trail)
 */
export declare function findAllEvents(limit?: number): Promise<Event[]>;
/**
 * Find events within a date range
 */
export declare function findEventsByDateRange(startDate: string, endDate: string): Promise<Event[]>;
//# sourceMappingURL=event-repository.d.ts.map