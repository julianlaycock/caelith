/**
 * Compliance Calendar Service
 * 
 * Aggregates regulatory deadlines from live fund data:
 * - KYC expiry dates (from investors)
 * - Annex IV filing deadlines (quarterly, based on fund structures)
 * - SFDR periodic report deadlines (annual)
 * - KYC review dates (from investor_documents)
 * - Eligibility criteria effective dates
 * - Static regulatory deadlines (AIFMD II, AMLR, etc.)
 */

import { queryInTenantContext } from '../db.js';
import { logger } from '../lib/logger.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;            // ISO date (YYYY-MM-DD)
  category: 'kyc' | 'reporting' | 'regulatory' | 'document' | 'review';
  severity: 'critical' | 'warning' | 'info';
  entityType?: string;     // investor, fund_structure, etc.
  entityId?: string;       // UUID
  entityName?: string;     // human-readable name
  daysUntil: number;       // negative = overdue
}

// ─── Static Regulatory Deadlines ─────────────────────────────────────

function getStaticDeadlines(year: number): CalendarEvent[] {
  return [
    // Annex IV quarterly deadlines (30 days after quarter end for most AIFMs)
    {
      id: `annex-iv-q1-${year}`,
      title: 'Annex IV Q1 Filing Deadline',
      description: `AIFMD Annex IV report due for Q1 ${year} (30 days after quarter end)`,
      date: `${year}-04-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    {
      id: `annex-iv-q2-${year}`,
      title: 'Annex IV Q2 Filing Deadline',
      description: `AIFMD Annex IV report due for Q2 ${year}`,
      date: `${year}-07-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    {
      id: `annex-iv-q3-${year}`,
      title: 'Annex IV Q3 Filing Deadline',
      description: `AIFMD Annex IV report due for Q3 ${year}`,
      date: `${year}-10-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    {
      id: `annex-iv-q4-${year}`,
      title: 'Annex IV Q4 Filing Deadline',
      description: `AIFMD Annex IV report due for Q4 ${year}`,
      date: `${year + 1}-01-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    // SFDR periodic disclosure (annual, within 12 months of reference date)
    {
      id: `sfdr-annual-${year}`,
      title: 'SFDR Annual Disclosure',
      description: `SFDR periodic disclosure for Art. 8/9 funds (reference year ${year - 1})`,
      date: `${year}-06-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    // BaFin annual report
    {
      id: `bafin-annual-${year}`,
      title: 'BaFin Annual Report Deadline',
      description: `Annual activity report to BaFin for financial year ${year - 1}`,
      date: `${year}-06-30`,
      category: 'reporting',
      severity: 'warning',
      daysUntil: 0,
    },
    // Key upcoming regulatory milestones
    {
      id: 'aifmd-ii-transposition',
      title: 'AIFMD II Transposition Deadline',
      description: 'EU Member States must transpose AIFMD II into national law',
      date: '2026-04-16',
      category: 'regulatory',
      severity: 'critical',
      daysUntil: 0,
    },
    {
      id: 'amlr-effective',
      title: 'AMLR Effective Date',
      description: 'EU Anti-Money Laundering Regulation (AMLR) becomes directly applicable',
      date: '2027-07-10',
      category: 'regulatory',
      severity: 'info',
      daysUntil: 0,
    },
    {
      id: 'dora-effective',
      title: 'DORA Effective Date',
      description: 'Digital Operational Resilience Act — ICT risk management requirements for financial entities',
      date: '2025-01-17',
      category: 'regulatory',
      severity: 'info',
      daysUntil: 0,
    },
  ];
}

// ─── Dynamic Deadlines from DB ───────────────────────────────────────

interface KycRow {
  id: string;
  name: string;
  kyc_expiry: string;
  kyc_status: string;
}

interface DocRow {
  id: string;
  investor_id: string;
  investor_name: string;
  document_type: string;
  expiry_date: string;
}

interface FundRow {
  id: string;
  name: string;
  sfdr_classification: string;
}

async function getKycDeadlines(tenantId: string): Promise<CalendarEvent[]> {
  const rows = await queryInTenantContext<KycRow>(
    `SELECT i.id, i.name, i.kyc_expiry, i.kyc_status
     FROM investors i
     WHERE i.tenant_id = $1
       AND i.deleted_at IS NULL
       AND i.kyc_expiry IS NOT NULL
     ORDER BY i.kyc_expiry ASC`,
    [tenantId],
    tenantId
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map(row => {
    const expiry = new Date(row.kyc_expiry);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const severity: CalendarEvent['severity'] =
      daysUntil < 0 ? 'critical' :
      daysUntil <= 30 ? 'critical' :
      daysUntil <= 90 ? 'warning' : 'info';

    return {
      id: `kyc-expiry-${row.id}`,
      title: `KYC Expiry: ${row.name}`,
      description: daysUntil < 0
        ? `KYC expired ${Math.abs(daysUntil)} days ago. Status: ${row.kyc_status}. Immediate renewal required.`
        : `KYC expires in ${daysUntil} days. Current status: ${row.kyc_status}.`,
      date: row.kyc_expiry,
      category: 'kyc' as const,
      severity,
      entityType: 'investor',
      entityId: row.id,
      entityName: row.name,
      daysUntil,
    };
  });
}

async function getDocumentExpiryDeadlines(tenantId: string): Promise<CalendarEvent[]> {
  const rows = await queryInTenantContext<DocRow>(
    `SELECT d.id, d.investor_id, i.name as investor_name, d.document_type, d.expiry_date
     FROM investor_documents d
     JOIN investors i ON d.investor_id = i.id
     WHERE d.tenant_id = $1
       AND d.expiry_date IS NOT NULL
       AND d.status != 'rejected'
       AND i.deleted_at IS NULL
     ORDER BY d.expiry_date ASC`,
    [tenantId],
    tenantId
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map(row => {
    const expiry = new Date(row.expiry_date);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const severity: CalendarEvent['severity'] =
      daysUntil < 0 ? 'critical' :
      daysUntil <= 30 ? 'critical' :
      daysUntil <= 90 ? 'warning' : 'info';

    const docLabel = row.document_type.replace(/_/g, ' ');

    return {
      id: `doc-expiry-${row.id}`,
      title: `Document Expiry: ${row.investor_name} — ${docLabel}`,
      description: daysUntil < 0
        ? `${docLabel} expired ${Math.abs(daysUntil)} days ago. Renewal required.`
        : `${docLabel} expires in ${daysUntil} days.`,
      date: row.expiry_date,
      category: 'document' as const,
      severity,
      entityType: 'investor',
      entityId: row.investor_id,
      entityName: row.investor_name,
      daysUntil,
    };
  });
}

async function getSfdrReportingDeadlines(tenantId: string): Promise<CalendarEvent[]> {
  const rows = await queryInTenantContext<FundRow>(
    `SELECT id, name, sfdr_classification
     FROM fund_structures
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND sfdr_classification IN ('article_8', 'article_9')`,
    [tenantId],
    tenantId
  );

  const today = new Date();
  const year = today.getFullYear();

  return rows.map(row => {
    const deadline = `${year}-06-30`;
    const daysUntil = Math.ceil((new Date(deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const classification = row.sfdr_classification.replace('article_', 'Art. ');

    return {
      id: `sfdr-${row.id}-${year}`,
      title: `SFDR Periodic Disclosure: ${row.name}`,
      description: `${classification} fund — annual sustainability disclosure due.`,
      date: deadline,
      category: 'reporting' as const,
      severity: daysUntil <= 30 ? 'critical' : daysUntil <= 90 ? 'warning' : 'info',
      entityType: 'fund_structure',
      entityId: row.id,
      entityName: row.name,
      daysUntil,
    };
  });
}

// ─── Public API ──────────────────────────────────────────────────────

export interface CalendarQuery {
  from?: string;    // ISO date
  to?: string;      // ISO date
  category?: string;
  severity?: string;
}

export async function getCalendarEvents(
  tenantId: string,
  query: CalendarQuery = {}
): Promise<CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  try {
    const [kycEvents, docEvents, sfdrEvents] = await Promise.all([
      getKycDeadlines(tenantId),
      getDocumentExpiryDeadlines(tenantId),
      getSfdrReportingDeadlines(tenantId),
    ]);

    // Get static deadlines for this year and next, deduplicate fixed-date events
    const seen = new Set<string>();
    const staticEvents = [
      ...getStaticDeadlines(year),
      ...getStaticDeadlines(year + 1),
    ].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    }).map(e => ({
      ...e,
      daysUntil: Math.ceil((new Date(e.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    })).map(e => ({
      ...e,
      severity: (e.daysUntil < 0 ? 'info' : e.daysUntil <= 30 ? 'critical' : e.daysUntil <= 90 ? 'warning' : 'info') as CalendarEvent['severity'],
    }));

    let all = [...kycEvents, ...docEvents, ...sfdrEvents, ...staticEvents];

    // Filter by date range
    if (query.from) {
      all = all.filter(e => e.date >= query.from!);
    }
    if (query.to) {
      all = all.filter(e => e.date <= query.to!);
    }
    if (query.category) {
      all = all.filter(e => e.category === query.category);
    }
    if (query.severity) {
      all = all.filter(e => e.severity === query.severity);
    }

    // Ensure all dates are strings
    all = all.map(e => ({
      ...e,
      date: typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().slice(0, 10),
    }));

    // Sort by date, critical first within same date
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    all.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return all;
  } catch (err) {
    logger.error('Calendar service error', { error: err });
    throw err;
  }
}

export async function getUpcomingAlerts(
  tenantId: string,
  daysAhead: number = 30
): Promise<CalendarEvent[]> {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const from = today.toISOString().slice(0, 10);
  const to = cutoff.toISOString().slice(0, 10);

  const events = await getCalendarEvents(tenantId, { from, to });

  // Also include overdue items (negative daysUntil)
  const overdue = await getCalendarEvents(tenantId);
  const overdueItems = overdue.filter(e => e.daysUntil < 0);

  const combined = [...overdueItems, ...events];
  // Deduplicate by id
  const seen = new Set<string>();
  return combined.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}
