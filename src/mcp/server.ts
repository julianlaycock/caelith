import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────
const CAELITH_API_URL = process.env.CAELITH_API_URL || 'http://localhost:3001';
const CAELITH_API_TOKEN = process.env.CAELITH_API_TOKEN;

if (!CAELITH_API_TOKEN) {
  console.error('FATAL: CAELITH_API_TOKEN is required. Generate one via POST /api/auth/login');
  process.exit(1);
}

// ── Helper: authenticated API calls ─────────────────────────────────────────

interface ApiErrorBody {
  error?: string;
  message?: string;
}

async function caelithApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${CAELITH_API_URL}/api${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CAELITH_API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'UNKNOWN', message: response.statusText })) as ApiErrorBody;
    throw new Error(`Caelith API ${response.status}: ${body.message || body.error || response.statusText}`);
  }

  return response.json();
}

// ── MCP Server ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'caelith',
  version: '1.0.0',
});

// ── Tool 1: get_compliance_report ───────────────────────────────────────────
server.tool(
  'get_compliance_report',
  'Get a fund-level compliance snapshot with risk flags, investor distribution, and regulatory status',
  { fund_structure_id: z.string().describe('The UUID of the fund structure') },
  async ({ fund_structure_id }) => {
    const report = await caelithApi(`/reports/compliance/${fund_structure_id}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }] };
  }
);

// ── Tool 2: check_eligibility ───────────────────────────────────────────────
server.tool(
  'check_eligibility',
  'Run eligibility check for a specific investor against a fund structure, returning pass/fail with per-check details and regulatory citations',
  {
    investor_id: z.string().describe('The UUID of the investor'),
    fund_structure_id: z.string().describe('The UUID of the fund structure to check eligibility against'),
    investment_amount: z.number().optional().describe('Optional investment amount in cents for minimum investment checks'),
  },
  async ({ investor_id, fund_structure_id, investment_amount }) => {
    const result = await caelithApi('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({ investor_id, fund_structure_id, investment_amount }),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 3: explain_decision ────────────────────────────────────────────────
server.tool(
  'explain_decision',
  'Get a human-readable explanation of a compliance decision record, including what checks passed/failed and why',
  { decision_id: z.string().describe('The UUID of the decision record') },
  async ({ decision_id }) => {
    const decision = await caelithApi(`/decisions/${decision_id}`);
    return { content: [{ type: 'text' as const, text: JSON.stringify(decision, null, 2) }] };
  }
);

// ── Tool 4: search_investors ────────────────────────────────────────────────
// NOTE [2026-02-21]: Backend GET /api/investors does not support query param filtering.
// Filtering is done client-side. For large datasets, add server-side filtering with
// query params (jurisdiction, investor_type, kyc_status) to the investor-routes.
// Tracked as: BACKLOG — Server-side investor filtering for MCP
server.tool(
  'search_investors',
  'Search and filter investors by jurisdiction, classification type, or KYC status',
  {
    jurisdiction: z.string().optional().describe('Filter by jurisdiction code, e.g. "LU", "IE", "US"'),
    investor_type: z.string().optional().describe('Filter by type: institutional, professional, semi_professional, well_informed, retail'),
    kyc_status: z.string().optional().describe('Filter by KYC status: pending, verified, expired'),
  },
  async ({ jurisdiction, investor_type, kyc_status }) => {
    const allInvestors = (await caelithApi('/investors')) as Array<Record<string, unknown>>;
    let filtered = allInvestors;
    if (jurisdiction) filtered = filtered.filter((i) => i.jurisdiction === jurisdiction);
    if (investor_type) filtered = filtered.filter((i) => i.investor_type === investor_type);
    if (kyc_status) filtered = filtered.filter((i) => i.kyc_status === kyc_status);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ count: filtered.length, investors: filtered }, null, 2) }],
    };
  }
);

// ── Tool 5: get_onboarding_pipeline ─────────────────────────────────────────
server.tool(
  'get_onboarding_pipeline',
  'View the current investor onboarding pipeline, optionally filtered by asset',
  { asset_id: z.string().optional().describe('Optional asset UUID to filter by') },
  async ({ asset_id }) => {
    const path = asset_id ? `/onboarding?asset_id=${encodeURIComponent(asset_id)}` : '/onboarding';
    try {
      const records = await caelithApi(path);
      return { content: [{ type: 'text' as const, text: JSON.stringify(records, null, 2) }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('400') && !asset_id) {
        return { content: [{ type: 'text' as const, text: 'Please provide an asset_id — the onboarding endpoint requires at least one filter.' }] };
      }
      throw err;
    }
  }
);

// ── Tool 6: query_regulations ───────────────────────────────────────────────
server.tool(
  'query_regulations',
  'Search regulatory documents using semantic search. Ask questions about AIFMD, ELTIF, SIF, RAIF, or any ingested regulation',
  {
    question: z.string().describe('Natural language question about regulations'),
    jurisdiction: z.string().optional().describe('Filter by jurisdiction code, e.g. "EU", "LU", "IE"'),
    framework: z.string().optional().describe('Filter by regulatory framework, e.g. "AIFMD", "ELTIF"'),
  },
  async ({ question, jurisdiction, framework }) => {
    const body: Record<string, unknown> = { question };
    const filters: Record<string, string> = {};
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (framework) filters.framework = framework;
    if (Object.keys(filters).length > 0) body.filters = filters;

    const result = await caelithApi('/regulatory/query', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 7: verify_audit_chain ──────────────────────────────────────────────
server.tool(
  'verify_audit_chain',
  'Verify the cryptographic integrity of the decision record hash chain. Returns whether the chain is valid and identifies any broken links',
  { limit: z.number().optional().describe('Number of recent records to verify (default: all)') },
  async ({ limit }) => {
    const path = typeof limit === 'number' ? `/decisions/verify-chain?limit=${limit}` : '/decisions/verify-chain';
    const result = await caelithApi(path);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Start ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
