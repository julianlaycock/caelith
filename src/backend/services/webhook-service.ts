/**
 * Webhook Service
 *
 * Manages webhook registrations and dispatches event notifications.
 * Delivery is fire-and-forget with retry tracking.
 */

import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import { query, execute } from '../db.js';

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
 * Validate webhook URL format
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Register a new webhook
 */
export async function createWebhook(
  url: string,
  eventTypes: string[],
  userId?: string
): Promise<Webhook> {
  if (!isValidWebhookUrl(url)) {
    throw new Error('Invalid webhook URL: must be a valid HTTP or HTTPS URL');
  }
  const id = randomUUID();
  const secret = randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO webhooks (id, url, secret, event_types, active, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, url, secret, JSON.stringify(eventTypes), true, userId || null, now, now]
  );

  return {
    id,
    url,
    secret,
    event_types: eventTypes,
    active: true,
    created_by: userId || null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * List all webhooks
 */
export async function listWebhooks(): Promise<Webhook[]> {
  return query<Webhook>('SELECT * FROM webhooks ORDER BY created_at DESC', []);
}

/**
 * Update webhook status
 */
export async function updateWebhook(
  id: string,
  updates: { url?: string; event_types?: string[]; active?: boolean }
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];

  if (updates.url !== undefined) {
    if (!isValidWebhookUrl(updates.url)) {
      throw new Error('Invalid webhook URL: must be a valid HTTP or HTTPS URL');
    }
    sets.push('url = ?');
    params.push(updates.url);
  }
  if (updates.event_types !== undefined) {
    sets.push('event_types = ?');
    params.push(JSON.stringify(updates.event_types));
  }
  if (updates.active !== undefined) {
    sets.push('active = ?');
    params.push(updates.active);
  }

  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await execute(`UPDATE webhooks SET ${sets.join(', ')} WHERE id = ?`, params);
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  await execute('DELETE FROM webhooks WHERE id = ?', [id]);
}

/**
 * Get recent deliveries for a webhook
 */
export async function getDeliveries(
  webhookId: string,
  limit: number = 20
): Promise<WebhookDelivery[]> {
  return query<WebhookDelivery>(
    'SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?',
    [webhookId, limit]
  );
}

/**
 * Sign a payload with the webhook secret
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch an event to all matching webhooks
 * Fire-and-forget — does not block the caller
 */
export async function dispatchEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await query<Webhook>(
    `SELECT * FROM webhooks WHERE active = ?`,
    [true]
  );

  for (const webhook of webhooks) {
    // Check if webhook subscribes to this event type (safely parse)
    let types: string[];
    if (typeof webhook.event_types === 'string') {
      try {
        types = JSON.parse(webhook.event_types);
      } catch {
        console.error('[webhook] Invalid event_types for webhook', webhook.id);
        continue;
      }
    } else {
      types = webhook.event_types;
    }
    if (!Array.isArray(types)) {
      console.error('[webhook] event_types is not an array for webhook', webhook.id);
      continue;
    }
    if (!types.includes('*') && !types.includes(eventType)) {
      continue;
    }

    // Create delivery record
    const deliveryId = randomUUID();
    const now = new Date().toISOString();
    const body = JSON.stringify({ event_type: eventType, payload, timestamp: now });
    const signature = signPayload(body, webhook.secret);

    await execute(
      `INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deliveryId, webhook.id, eventType, body, 'pending', 0, now]
    );

    // Fire-and-forget delivery attempt
    deliverWebhook(deliveryId, webhook.url, body, signature).catch((err) => {
      console.error('[webhook] Delivery failed for', deliveryId, ':', err instanceof Error ? err.message : err);
    });
  }
}

/**
 * Attempt to deliver a webhook payload
 */
async function deliverWebhook(
  deliveryId: string,
  url: string,
  body: string,
  signature: string
): Promise<void> {
  const now = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Caelith-Signature': signature,
        'X-Caelith-Event': JSON.parse(body).event_type,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    await execute(
      `UPDATE webhook_deliveries SET status = ?, response_code = ?, attempts = attempts + 1, last_attempt_at = ? WHERE id = ?`,
      [res.ok ? 'success' : 'failed', res.status, now, deliveryId]
    );
  } catch {
    await execute(
      `UPDATE webhook_deliveries SET status = ?, attempts = attempts + 1, last_attempt_at = ? WHERE id = ?`,
      ['failed', now, deliveryId]
    );
  }
}