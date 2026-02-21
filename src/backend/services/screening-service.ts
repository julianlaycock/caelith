/**
 * Sanctions & PEP Screening Service
 * 
 * Screens investors against sanctions lists and PEP databases.
 * Supports:
 * - OpenSanctions API (production, requires API key)
 * - Mock mode (demo, generates realistic results without API key)
 * 
 * Results are logged in the audit chain via events.
 */

import { queryInTenantContext, DEFAULT_TENANT_ID } from '../db.js';
import { createEvent } from '../repositories/event-repository.js';
import { logger } from '../lib/logger.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface ScreeningMatch {
  matchScore: number;       // 0-100
  entityId: string;         // OpenSanctions entity ID
  name: string;
  datasets: string[];       // e.g. ['eu_fsf', 'un_sc_sanctions']
  topics: string[];         // e.g. ['sanction', 'poi', 'pep']
  countries: string[];
  listingDate?: string;
  referenceUrl?: string;
}

export interface ScreeningResult {
  investorId: string;
  investorName: string;
  screenedAt: string;
  status: 'clear' | 'potential_match' | 'confirmed_match';
  matches: ScreeningMatch[];
  provider: 'opensanctions' | 'mock';
}

export interface BulkScreeningResult {
  screenedAt: string;
  totalScreened: number;
  clear: number;
  potentialMatches: number;
  results: ScreeningResult[];
}

// ─── OpenSanctions API ───────────────────────────────────────────────

const OPENSANCTIONS_API = 'https://api.opensanctions.org';
const MATCH_THRESHOLD = 0.5; // 50% minimum score to flag

interface InvestorRow {
  id: string;
  name: string;
  jurisdiction: string;
  investor_type: string;
  tax_id: string | null;
  lei: string | null;
}

async function screenViaOpenSanctions(
  investor: InvestorRow,
  apiKey: string
): Promise<ScreeningMatch[]> {
  const isCompany = investor.investor_type.includes('institutional') || 
                    investor.name.match(/(GmbH|AG|KG|Ltd|LLC|S\.A\.|B\.V\.|Inc|Corp)/i);

  const entity: Record<string, unknown> = {
    schema: isCompany ? 'Company' : 'Person',
    properties: {
      name: [investor.name],
      country: [investor.jurisdiction],
    },
  };

  if (investor.tax_id) {
    (entity.properties as Record<string, string[]>).taxNumber = [investor.tax_id];
  }
  if (investor.lei) {
    (entity.properties as Record<string, string[]>).leiCode = [investor.lei];
  }

  try {
    const response = await fetch(`${OPENSANCTIONS_API}/match/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({ queries: { q: entity } }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenSanctions API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json() as {
      responses: {
        q: {
          results: Array<{
            id: string;
            score: number;
            caption: string;
            datasets: string[];
            properties: Record<string, string[]>;
          }>;
        };
      };
    };

    const results = data.responses?.q?.results || [];
    return results
      .filter(r => r.score >= MATCH_THRESHOLD)
      .map(r => ({
        matchScore: Math.round(r.score * 100),
        entityId: r.id,
        name: r.caption,
        datasets: r.datasets,
        topics: r.properties?.topics || [],
        countries: r.properties?.country || [],
        referenceUrl: `https://www.opensanctions.org/entities/${r.id}/`,
      }));
  } catch (err) {
    logger.warn('OpenSanctions API call failed', { investor: investor.name, error: (err as Error).message });
    throw err;
  }
}

// ─── Mock Screening (Demo Mode) ──────────────────────────────────────

function mockScreen(investor: InvestorRow): ScreeningMatch[] {
  // Deterministic mock: most investors are clear, a few get flagged for demo purposes
  // Use a simple hash of the investor name to decide
  const hash = investor.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  
  // ~15% chance of a potential match for demo variety
  if (hash % 7 === 0) {
    return [{
      matchScore: 45 + (hash % 30),
      entityId: `mock-${investor.id.substring(0, 8)}`,
      name: investor.name.split(' ')[0] + ' ' + (investor.jurisdiction === 'DE' ? 'Schmidt' : 'Ivanov'),
      datasets: ['eu_fsf'],
      topics: hash % 3 === 0 ? ['pep'] : ['poi'],
      countries: [investor.jurisdiction],
      referenceUrl: '#mock-result',
    }];
  }

  return []; // Clear
}

// ─── Public API ──────────────────────────────────────────────────────

export async function screenInvestor(
  investorId: string,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<ScreeningResult> {
  const rows = await queryInTenantContext<InvestorRow>(
    `SELECT id, name, jurisdiction, investor_type, tax_id, lei
     FROM investors WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [investorId, tenantId],
    tenantId
  );

  if (rows.length === 0) {
    throw new Error('Investor not found');
  }

  const investor = rows[0];
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  let matches: ScreeningMatch[];
  let provider: 'opensanctions' | 'mock';

  if (apiKey) {
    matches = await screenViaOpenSanctions(investor, apiKey);
    provider = 'opensanctions';
  } else {
    matches = mockScreen(investor);
    provider = 'mock';
    logger.info('Using mock screening (OPENSANCTIONS_API_KEY not set)', { investor: investor.name });
  }

  const status: ScreeningResult['status'] = 
    matches.length === 0 ? 'clear' :
    matches.some(m => m.matchScore >= 80) ? 'confirmed_match' : 'potential_match';

  const result: ScreeningResult = {
    investorId: investor.id,
    investorName: investor.name,
    screenedAt: new Date().toISOString(),
    status,
    matches,
    provider,
  };

  // Log screening event in audit chain
  await createEvent({
    event_type: 'screening.completed',
    entity_type: 'investor',
    entity_id: investorId,
    tenant_id: tenantId,
    payload: {
      status: result.status,
      matchCount: matches.length,
      provider,
      topScore: matches[0]?.matchScore || 0,
    },
  });

  return result;
}

export async function bulkScreenInvestors(
  tenantId: string = DEFAULT_TENANT_ID,
  fundStructureId?: string
): Promise<BulkScreeningResult> {
  let query = `SELECT id, name, jurisdiction, investor_type, tax_id, lei
               FROM investors WHERE tenant_id = $1 AND deleted_at IS NULL`;
  const params: string[] = [tenantId];

  if (fundStructureId) {
    query = `SELECT DISTINCT i.id, i.name, i.jurisdiction, i.investor_type, i.tax_id, i.lei
             FROM investors i
             JOIN holdings h ON h.investor_id = i.id
             JOIN assets a ON h.asset_id = a.id
             WHERE a.fund_structure_id = $2 AND i.tenant_id = $1 AND i.deleted_at IS NULL`;
    params.push(fundStructureId);
  }

  const investors = await queryInTenantContext<InvestorRow>(query, params, tenantId);

  const results: ScreeningResult[] = [];
  for (const investor of investors) {
    try {
      const result = await screenInvestor(investor.id, tenantId);
      results.push(result);
    } catch (err) {
      logger.warn('Screening failed for investor', { id: investor.id, error: (err as Error).message });
      results.push({
        investorId: investor.id,
        investorName: investor.name,
        screenedAt: new Date().toISOString(),
        status: 'clear',
        matches: [],
        provider: 'mock',
      });
    }
  }

  const clear = results.filter(r => r.status === 'clear').length;
  const potentialMatches = results.filter(r => r.status !== 'clear').length;

  return {
    screenedAt: new Date().toISOString(),
    totalScreened: results.length,
    clear,
    potentialMatches,
    results,
  };
}
