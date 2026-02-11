/**
 * Webhook Service
 *
 * Manages webhook registrations and dispatches event notifications.
 * Delivery is fire-and-forget with retry tracking.
 */
export interface Webhook {
    id: string;
    url: string;
    secret: string;
    event_types: string[];
    active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface WebhookDelivery {
    id: string;
    webhook_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'success' | 'failed';
    response_code: number | null;
    attempts: number;
    last_attempt_at: string | null;
    created_at: string;
}
/**
 * Register a new webhook
 */
export declare function createWebhook(url: string, eventTypes: string[], userId?: string): Promise<Webhook>;
/**
 * List all webhooks
 */
export declare function listWebhooks(): Promise<Webhook[]>;
/**
 * Update webhook status
 */
export declare function updateWebhook(id: string, updates: {
    url?: string;
    event_types?: string[];
    active?: boolean;
}): Promise<void>;
/**
 * Delete a webhook
 */
export declare function deleteWebhook(id: string): Promise<void>;
/**
 * Get recent deliveries for a webhook
 */
export declare function getDeliveries(webhookId: string, limit?: number): Promise<WebhookDelivery[]>;
/**
 * Dispatch an event to all matching webhooks
 * Fire-and-forget — does not block the caller
 */
export declare function dispatchEvent(eventType: string, payload: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=webhook-service.d.ts.map