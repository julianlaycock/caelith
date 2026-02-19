import type { Investor, ComplianceReport, CapTableEntry, Event } from './types';

export interface FundReportPair {
  fund: import('./types').FundStructure;
  report: ComplianceReport;
}

export interface TrendMetric {
  current: number;
  previous: number;
}

export interface ActionQueueItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  href: string;
}

export interface RiskFlag {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  details?: import('./types').RiskFlagDetail[];
}

export function aggregateByType(investors: Investor[], reports: ComplianceReport[]) {
  const countMap = new Map<string, number>();
  for (const inv of investors) {
    countMap.set(inv.investor_type, (countMap.get(inv.investor_type) || 0) + 1);
  }
  const unitsMap = new Map<string, number>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_type) {
      unitsMap.set(entry.type, (unitsMap.get(entry.type) || 0) + entry.total_units);
    }
  }
  const allTypes = new Set([...Array.from(countMap.keys()), ...Array.from(unitsMap.keys())]);
  return Array.from(allTypes).map((type) => ({
    type,
    count: countMap.get(type) || 0,
    total_units: unitsMap.get(type) || 0,
  }));
}

export function aggregateByJurisdiction(investors: Investor[], reports: ComplianceReport[]) {
  const countMap = new Map<string, number>();
  for (const inv of investors) {
    countMap.set(inv.jurisdiction, (countMap.get(inv.jurisdiction) || 0) + 1);
  }
  const unitsMap = new Map<string, number>();
  for (const r of reports) {
    for (const entry of r.investor_breakdown.by_jurisdiction) {
      unitsMap.set(entry.jurisdiction, (unitsMap.get(entry.jurisdiction) || 0) + entry.total_units);
    }
  }
  const allJurisdictions = new Set([...Array.from(countMap.keys()), ...Array.from(unitsMap.keys())]);
  return Array.from(allJurisdictions).map((jurisdiction) => ({
    jurisdiction,
    count: countMap.get(jurisdiction) || 0,
    total_units: unitsMap.get(jurisdiction) || 0,
  }));
}

export function aggregateKycData(investors: Investor[]) {
  let verified = 0;
  let pending = 0;
  let expired = 0;
  let expiring_soon = 0;
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  for (const inv of investors) {
    if (inv.kyc_status === 'verified') {
      if (inv.kyc_expiry) {
        const expiryDate = new Date(inv.kyc_expiry);
        if (expiryDate < now) expired += 1;
        else if (expiryDate <= ninetyDaysFromNow) expiring_soon += 1;
        else verified += 1;
      } else {
        verified += 1;
      }
    } else if (inv.kyc_status === 'pending') {
      pending += 1;
    } else if (inv.kyc_status === 'expired') {
      expired += 1;
    }
  }
  return { verified, pending, expired, expiring_soon };
}

export function aggregateViolations(reports: ComplianceReport[], assetNameMap: Record<string, string>) {
  const map = new Map<string, { violations: number; total: number }>();
  for (const r of reports) {
    for (const d of r.recent_decisions) {
      const existing = map.get(d.asset_id) || { violations: 0, total: 0 };
      map.set(d.asset_id, {
        violations: existing.violations + d.violation_count,
        total: existing.total + 1,
      });
    }
  }
  return Array.from(map.entries())
    .filter(([, data]) => data.violations > 0)
    .map(([asset_id, data]) => ({
      asset_name: assetNameMap[asset_id] || asset_id.slice(0, 8),
      violation_count: data.violations,
      total_decisions: data.total,
    }));
}

export function computeConcentration(
  fundReports: FundReportPair[],
  capTables: Map<string, CapTableEntry[]>
): { fund_name: string; top_investor_pct: number; top3_investor_pct: number; hhi: number }[] {
  return fundReports.map(({ fund, report }) => {
    const allEntries: CapTableEntry[] = [];
    for (const asset of report.fund.assets) {
      const entries = capTables.get(asset.id);
      if (entries) allEntries.push(...entries);
    }
    if (allEntries.length === 0) return { fund_name: fund.name, top_investor_pct: 0, top3_investor_pct: 0, hhi: 0 };
    const investorUnits = new Map<string, number>();
    let totalUnits = 0;
    for (const entry of allEntries) {
      investorUnits.set(entry.investor_id, (investorUnits.get(entry.investor_id) || 0) + entry.units);
      totalUnits += entry.units;
    }
    if (totalUnits === 0) return { fund_name: fund.name, top_investor_pct: 0, top3_investor_pct: 0, hhi: 0 };
    const pcts = Array.from(investorUnits.values()).map((u) => (u / totalUnits) * 100).sort((a, b) => b - a);
    const top_investor_pct = pcts[0] || 0;
    const top3_investor_pct = pcts.slice(0, 3).reduce((s, p) => s + p, 0);
    const hhi = Math.round(pcts.reduce((s, p) => s + p * p, 0));
    return { fund_name: fund.name, top_investor_pct, top3_investor_pct, hhi };
  });
}

export function calculateEventTrend(events: Event[], eventType: string): TrendMetric {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const currentStart = now - sevenDaysMs;
  const previousStart = now - 2 * sevenDaysMs;
  let current = 0;
  let previous = 0;
  for (const event of events) {
    if (event.event_type !== eventType) continue;
    const timestamp = new Date(event.timestamp).getTime();
    if (timestamp >= currentStart && timestamp <= now) current += 1;
    else if (timestamp >= previousStart && timestamp < currentStart) previous += 1;
  }
  return { current, previous };
}

export function formatTrend(metric: TrendMetric): string {
  const delta = metric.current - metric.previous;
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta}`;
  return `7d ${deltaLabel} vs prior`;
}
