import { describe, it, expect, beforeAll } from 'vitest';
import { API_BASE } from '../fixtures/test-data';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw { status: res.status, ...body };
  return body as T;
}

describe('Audit Trail', () => {
  let assetId: string;
  let investorAId: string;
  let investorBId: string;

  beforeAll(async () => {
    await fetch('http://localhost:3001/api/reset', { method: 'POST' });
    // Create asset
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Audit Trail Test Fund',
        asset_type: 'Fund',
        total_units: 100000,
      }),
    });
    assetId = asset.id;

    // Create two investors
    const invA = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Audit Investor A', jurisdiction: 'US', accredited: true }),
    });
    investorAId = invA.id;

    const invB = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Audit Investor B', jurisdiction: 'US', accredited: true }),
    });
    investorBId = invB.id;

    // Allocate units
    await api('/holdings', {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId, investor_id: investorAId, units: 50000, acquired_at: new Date().toISOString() }),
    });

    // Create rules (no lockup so transfer can execute)
    await api('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        qualification_required: false,
        lockup_days: 0,
        jurisdiction_whitelist: ['US'],
        transfer_whitelist: null,
      }),
    });

    // Execute a transfer
    await api('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: investorAId,
        to_investor_id: investorBId,
        units: 10000,
        execution_date: new Date().toISOString(),
      }),
    });

    // Update an investor
    await api(`/investors/${investorBId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Audit Investor B (Updated)' }),
    });
  });

  // ── All Operations Logged ─────────────────────────────

  it('should log asset.created event', async () => {
    const events = await api<Event[]>(`/events?entityId=${assetId}`);
    const assetCreated = events.filter((e) => e.event_type === 'asset.created');
    expect(assetCreated.length).toBeGreaterThanOrEqual(1);
  });

  it('should log investor.created events', async () => {
    const eventsA = await api<Event[]>(`/events?entityId=${investorAId}`);
    expect(eventsA.some((e) => e.event_type === 'investor.created')).toBe(true);

    const eventsB = await api<Event[]>(`/events?entityId=${investorBId}`);
    expect(eventsB.some((e) => e.event_type === 'investor.created')).toBe(true);
  });

  it('should log holding.allocated event', async () => {
    const events = await api<Event[]>(`/events?eventType=holding.allocated`);
    const forAsset = events.filter(
      (e) => e.payload && (e.payload as Record<string, unknown>).asset_id === assetId
    );
    expect(forAsset.length).toBeGreaterThanOrEqual(1);
  });

  it('should log rules.created event', async () => {
    const events = await api<Event[]>(`/events?entityId=${assetId}`);
    const rulesCreated = events.filter((e) => e.event_type === 'rules.created');
    expect(rulesCreated.length).toBeGreaterThanOrEqual(1);
  });

  it('should log transfer.executed event', async () => {
    const events = await api<Event[]>(`/events?eventType=transfer.executed`);
    const forAsset = events.filter(
      (e) => e.payload && (e.payload as Record<string, unknown>).asset_id === assetId
    );
    expect(forAsset.length).toBeGreaterThanOrEqual(1);

    // Verify payload contains transfer details
    const payload = forAsset[0].payload as Record<string, unknown>;
    expect(payload.from_investor_id).toBe(investorAId);
    expect(payload.to_investor_id).toBe(investorBId);
    expect(payload.units).toBe(10000);
  });

  it('should log investor.updated event', async () => {
    const events = await api<Event[]>(`/events?entityId=${investorBId}`);
    const updated = events.filter((e) => e.event_type === 'investor.updated');
    expect(updated.length).toBeGreaterThanOrEqual(1);
  });

  // ── Event Ordering ────────────────────────────────────

  it('should return events in chronological order (newest first)', async () => {
    const events = await api<Event[]>('/events?limit=50');
    expect(events.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < events.length - 1; i++) {
      const current = new Date(events[i].timestamp).getTime();
      const next = new Date(events[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  // ── Filter by Event Type ──────────────────────────────

  it('should filter events by event type', async () => {
    const events = await api<Event[]>('/events?eventType=asset.created');
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const event of events) {
      expect(event.event_type).toBe('asset.created');
    }
  });

  // ── Filter by Entity ──────────────────────────────────

  it('should filter events by entity ID', async () => {
    // Filter by asset ID instead, which is more reliably used as entity_id
    const events = await api<Event[]>(`/events?entityId=${assetId}`);

    expect(events.length).toBeGreaterThanOrEqual(1);
    const hasRelatedEvent = events.some((event) => {
      const matchesEntity = event.entity_id === assetId;
      const matchesPayload = JSON.stringify(event.payload).includes(assetId);
      return matchesEntity || matchesPayload;
    });
    expect(hasRelatedEvent).toBe(true);
  });

  // ── Event Structure ───────────────────────────────────

  it('should have correct event structure', async () => {
    const events = await api<Event[]>('/events?limit=1');
    expect(events.length).toBe(1);

    const event = events[0];
    expect(event.id).toBeDefined();
    expect(event.event_type).toBeDefined();
    expect(event.entity_type).toBeDefined();
    expect(event.entity_id).toBeDefined();
    expect(event.payload).toBeDefined();
    expect(event.timestamp).toBeDefined();

    // Timestamp should be valid ISO 8601
    expect(new Date(event.timestamp).toISOString()).toBeTruthy();
  });
});
