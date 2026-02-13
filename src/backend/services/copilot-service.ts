import { createEvent } from '../repositories/event-repository.js';
import { DEFAULT_TENANT_ID, query } from '../db.js';
import { ragService, RagResult } from './rag-service.js';
import { compileNaturalLanguageRule } from './nl-rule-compiler.js';
import type { EntityType } from '../models/index.js';
import { RateLimitError, ValidationError } from '../errors.js';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

const VALID_ENTITY_TYPES: Set<EntityType> = new Set([
  'asset',
  'investor',
  'holding',
  'rules',
  'transfer',
  'composite_rule',
  'fund_structure',
  'eligibility_criteria',
  'decision_record',
  'onboarding_record',
  'regulatory_document',
]);

export interface CopilotRequest {
  message: string;
  context?: {
    currentPage?: string;
    selectedEntityId?: string;
    selectedEntityType?: string;
  };
}

export interface Citation {
  documentTitle: string;
  articleRef?: string | null;
  excerpt?: string;
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface CopilotResponse {
  message: string;
  intent: string;
  citations?: Citation[];
  suggestedActions?: SuggestedAction[];
}

type CopilotIntent = 'explain_decision' | 'regulatory_qa' | 'draft_rule' | 'what_if';

interface DecisionRow {
  id: string;
  decision_type: string;
  result: string;
  result_details: unknown;
  decided_at: string | Date;
}

interface FundLookupRow {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
}

interface InvestorImpactRow {
  id: string;
  name: string;
  invested_eur: number;
}

interface CountRow {
  count: number;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  name?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

function sanitizeMessage(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractUuid(input: string): string | null {
  const match = input.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/);
  return match ? match[0] : null;
}

function isEntityType(value: string | undefined): value is EntityType {
  if (!value) {
    return false;
  }
  return VALID_ENTITY_TYPES.has(value as EntityType);
}

function parseResultDetails(value: unknown): { checks: Array<{ rule: string; passed: boolean; message: string }> } {
  const parsed = typeof value === 'string' ? JSON.parse(value) as Record<string, unknown> : value as Record<string, unknown>;
  const checksValue = parsed?.checks;
  if (!Array.isArray(checksValue)) {
    return { checks: [] };
  }

  const checks = checksValue.map(item => {
    const row = item as Record<string, unknown>;
    return {
      rule: typeof row.rule === 'string' ? row.rule : 'check',
      passed: Boolean(row.passed),
      message: typeof row.message === 'string' ? row.message : 'No details',
    };
  });

  return { checks };
}

function extractCitationsFromChecks(checks: Array<{ message: string }>): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const check of checks) {
    const matches = check.message.match(/\(([^()]*?(Art\.?|Law|Directive|Regulation)[^()]*)\)/gi);
    if (!matches) {
      continue;
    }

    for (const match of matches) {
      const normalized = match.replace(/[()]/g, '').trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        citations.push({ documentTitle: normalized });
      }
    }
  }

  return citations;
}

function heuristicIntent(message: string): CopilotIntent {
  const lower = message.toLowerCase();
  if (lower.includes('what if') || lower.includes('would happen if')) {
    return 'what_if';
  }
  if (lower.includes('create a rule') || lower.includes('make a rule') || lower.includes('block')) {
    return 'draft_rule';
  }
  if (lower.includes('why') || lower.includes('rejected') || lower.includes('decision')) {
    return 'explain_decision';
  }
  return 'regulatory_qa';
}

async function callAnthropic(body: Record<string, unknown>): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.text().catch(() => '');
        const retryable = response.status === 429 || response.status >= 500;

        if (retryable && attempt < MAX_RETRIES - 1) {
          const delayMs = Math.min(8000, 400 * 2 ** attempt) + Math.floor(Math.random() * 200);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        throw new Error(`Anthropic API error ${response.status}: ${payload.slice(0, 300)}`);
      }

      return await response.json() as AnthropicResponse;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Unknown Anthropic request error');

      if (attempt < MAX_RETRIES - 1) {
        const delayMs = Math.min(8000, 400 * 2 ** attempt) + Math.floor(Math.random() * 200);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Anthropic request failed');
}

async function classifyIntent(message: string): Promise<CopilotIntent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return heuristicIntent(message);
  }

  try {
    const response = await callAnthropic({
      model: ANTHROPIC_MODEL,
      max_tokens: 128,
      temperature: 0,
      system: 'You are a compliance copilot. Classify user intent by selecting exactly one tool.',
      tools: [
        {
          name: 'explain_decision',
          description: 'User asks why a transfer or decision passed/failed.',
          input_schema: {
            type: 'object',
            properties: {
              rationale: { type: 'string' },
            },
            required: ['rationale'],
          },
        },
        {
          name: 'regulatory_qa',
          description: 'User asks about regulatory requirements and legal text.',
          input_schema: {
            type: 'object',
            properties: {
              rationale: { type: 'string' },
            },
            required: ['rationale'],
          },
        },
        {
          name: 'draft_rule',
          description: 'User asks to create/generate a compliance rule.',
          input_schema: {
            type: 'object',
            properties: {
              rationale: { type: 'string' },
            },
            required: ['rationale'],
          },
        },
        {
          name: 'what_if',
          description: 'User asks impact analysis under changed parameters.',
          input_schema: {
            type: 'object',
            properties: {
              rationale: { type: 'string' },
            },
            required: ['rationale'],
          },
        },
      ],
      messages: [{ role: 'user', content: message }],
    });

    const toolUse = response.content.find(block => block.type === 'tool_use');
    if (toolUse && toolUse.name) {
      const intent = toolUse.name as CopilotIntent;
      if (intent === 'explain_decision' || intent === 'regulatory_qa' || intent === 'draft_rule' || intent === 'what_if') {
        return intent;
      }
    }
  } catch {
    // Fall through to heuristic classifier.
  }

  return heuristicIntent(message);
}

async function summarizeRagAnswer(question: string, results: RagResult[]): Promise<string> {
  if (results.length === 0) {
    return 'No regulatory documents have been ingested yet for this tenant.';
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return `Top regulatory context for "${question}":\n\n${results
      .slice(0, 2)
      .map(result => `- ${result.content.slice(0, 500)}...`)
      .join('\n')}`;
  }

  const context = results
    .slice(0, 5)
    .map((result, index) => `Chunk ${index + 1} (${result.documentTitle}${result.articleRef ? `, ${result.articleRef}` : ''}): ${result.content}`)
    .join('\n\n');

  const response = await callAnthropic({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    temperature: 0.2,
    system: 'Answer strictly from the provided regulatory excerpts. If uncertain, say so.',
    messages: [
      {
        role: 'user',
        content: `Question: ${question}\n\nExcerpts:\n${context}`,
      },
    ],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.text?.trim() || 'Unable to synthesize an answer from the retrieved excerpts.';
}

function parseEuroAmount(message: string): number | null {
  const match = message.match(/(?:�|eur)?\s*([0-9]{1,3}(?:[\s.,][0-9]{3})+|[0-9]+)(\s*[kKmM])?/i);
  if (!match) {
    return null;
  }

  const numeric = match[1].replace(/[\s.,]/g, '');
  let value = Number(numeric);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const suffix = match[2]?.trim().toLowerCase();
  if (suffix === 'k') {
    value *= 1_000;
  } else if (suffix === 'm') {
    value *= 1_000_000;
  }

  return value;
}

async function enforceRateLimit(tenantId: string, userId: string): Promise<void> {
  const rows = await query<CountRow>(
    `SELECT COUNT(*)::int AS count
     FROM events
     WHERE tenant_id = $1
       AND event_type = 'copilot.query'
       AND timestamp >= NOW() - INTERVAL '1 hour'
       AND payload->>'user_id' = $2`,
    [tenantId, userId]
  );

  if ((rows[0]?.count || 0) >= 20) {
    throw new RateLimitError('Rate limit exceeded');
  }
}

async function handleExplainDecision(message: string, tenantId: string): Promise<CopilotResponse> {
  const decisionId = extractUuid(message);
  const rows = decisionId
    ? await query<DecisionRow>(
      `SELECT id, decision_type, result, result_details, decided_at
       FROM decision_records
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [decisionId, tenantId]
    )
    : await query<DecisionRow>(
      `SELECT id, decision_type, result, result_details, decided_at
       FROM decision_records
       WHERE tenant_id = $1
       ORDER BY decided_at DESC
       LIMIT 3`,
      [tenantId]
    );

  if (rows.length === 0) {
    return {
      intent: 'explain_decision',
      message: 'No decision records were found for this tenant yet.',
    };
  }

  const snippets = rows.map((row) => {
    const details = parseResultDetails(row.result_details);
    const checks = details.checks
      .slice(0, 6)
      .map(check => `- ${check.passed ? 'PASS' : 'FAIL'} ${check.rule}: ${check.message}`)
      .join('\n');

    return `Decision ${row.id} (${String(row.decided_at).slice(0, 10)}) was ${row.result}.\n${checks}`;
  });

  const citations = extractCitationsFromChecks(rows.flatMap(row => parseResultDetails(row.result_details).checks));

  return {
    intent: 'explain_decision',
    message: snippets.join('\n\n'),
    citations,
    suggestedActions: [
      {
        label: 'Open Decisions',
        action: 'navigate',
        payload: { path: '/decisions' },
      },
    ],
  };
}

async function handleRegulatoryQa(message: string, tenantId: string): Promise<CopilotResponse> {
  let results: RagResult[] = [];
  try {
    results = await ragService.query(message, {
      tenantId,
      topK: 5,
    });
  } catch (err: any) {
    console.warn('RAG query failed (embedding service may be unavailable):', err.message);
  }

  if (results.length === 0) {
    // Fallback: use Claude's built-in regulatory knowledge
    try {
      const fallbackResponse = await callAnthropic({
        model: ANTHROPIC_MODEL,
        max_tokens: 800,
        temperature: 0.2,
        system: `You are the Caelith Compliance Copilot, an expert on Luxembourg fund regulation and EU financial compliance.

You have deep knowledge of:
- Luxembourg SIF (Specialized Investment Fund) Law of 13 February 2007
- RAIF (Reserved Alternative Investment Fund) regime
- AIFMD (Alternative Investment Fund Managers Directive) 2011/61/EU
- UCITS Directive 2009/65/EC
- CSSF (Commission de Surveillance du Secteur Financier) circulars and guidance
- EU Anti-Money Laundering Directives (AMLD 4/5/6)
- MiFID II investor categorization
- Luxembourg Company Law (1915 as amended)
- SCSp, SCA, SICAV, SICAF structures
- Well-informed investor requirements (€125,000 minimum or professional certification)
- KYC/AML requirements for fund administrators

Answer the user's regulatory question accurately and concisely. Cite specific articles, laws, or directives when relevant. Format your answer clearly.

If the question is outside your regulatory knowledge, say so honestly.

Note: This answer is based on regulatory knowledge, not from ingested documents. For document-specific analysis, regulatory documents can be uploaded through the platform.`,
        messages: [{ role: 'user', content: message }],
      });

      const textBlock = fallbackResponse.content.find(block => block.type === 'text');
      const answer = textBlock?.text?.trim() || 'Unable to generate a response.';

      return {
        intent: 'regulatory_qa',
        message: answer,
        citations: [],
        suggestedActions: [
          {
            label: 'Upload Documents for Enhanced Analysis',
            action: 'hint',
            payload: { endpoint: '/api/regulatory/ingest' },
          },
        ],
      };
    } catch (err: any) {
      console.warn('Regulatory QA fallback failed:', err.message);
      return {
        intent: 'regulatory_qa',
        message: 'I\'m unable to answer regulatory questions right now. Please ensure the Anthropic API key is configured, or upload regulatory documents through /api/regulatory/ingest for document-based answers.',
        citations: [],
        suggestedActions: [
          {
            label: 'Upload Documents',
            action: 'hint',
            payload: { endpoint: '/api/regulatory/ingest' },
          },
        ],
      };
    }
  }

  const answer = await summarizeRagAnswer(message, results);
  const citations: Citation[] = results.map(result => ({
    documentTitle: result.documentTitle,
    articleRef: result.articleRef,
    excerpt: result.content.slice(0, 180),
  }));

  return {
    intent: 'regulatory_qa',
    message: answer,
    citations,
  };
}

async function resolveAssetIdFromContextOrTenant(
  tenantId: string,
  context?: CopilotRequest['context']
): Promise<string | null> {
  if (context?.selectedEntityType === 'asset' && context.selectedEntityId) {
    return context.selectedEntityId;
  }

  const rows = await query<{ id: string }>(
    `SELECT id FROM assets WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [tenantId]
  );

  return rows[0]?.id || null;
}

async function handleDraftRule(request: CopilotRequest, tenantId: string): Promise<CopilotResponse> {
  const assetId = await resolveAssetIdFromContextOrTenant(tenantId, request.context);
  if (!assetId) {
    return {
      intent: 'draft_rule',
      message: 'No asset is available to attach a proposed rule. Select an asset and try again.',
    };
  }

  const compiled = await compileNaturalLanguageRule({
    description: request.message,
    asset_id: assetId,
  });

  const citations: Citation[] = compiled.source_suggestion
    ? [{ documentTitle: compiled.source_suggestion }]
    : [];

  return {
    intent: 'draft_rule',
    message: `Proposed rule (confidence ${Math.round(compiled.confidence * 100)}%):\n\n${JSON.stringify(compiled.proposed_rule, null, 2)}\n\n${compiled.explanation}`,
    citations,
    suggestedActions: [
      {
        label: 'Apply Proposed Rule',
        action: 'apply_rule',
        payload: {
          asset_id: assetId,
          proposed_rule: compiled.proposed_rule,
        },
      },
    ],
  };
}

async function resolveFundForWhatIf(
  tenantId: string,
  context: CopilotRequest['context'] | undefined,
  message: string
): Promise<FundLookupRow | null> {
  if (context?.selectedEntityType === 'fund_structure' && context.selectedEntityId) {
    const byId = await query<FundLookupRow>(
      `SELECT id, name, legal_form, domicile
       FROM fund_structures
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [context.selectedEntityId, tenantId]
    );
    if (byId[0]) {
      return byId[0];
    }
  }

  const forMatch = message.match(/for\s+(.+)$/i);
  if (forMatch && forMatch[1]) {
    const candidate = forMatch[1].trim();
    const byName = await query<FundLookupRow>(
      `SELECT id, name, legal_form, domicile
       FROM fund_structures
       WHERE tenant_id = $1 AND name ILIKE $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, `%${candidate}%`]
    );
    if (byName[0]) {
      return byName[0];
    }
  }

  const fallback = await query<FundLookupRow>(
    `SELECT id, name, legal_form, domicile
     FROM fund_structures
     WHERE tenant_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [tenantId]
  );

  return fallback[0] || null;
}

async function handleWhatIf(request: CopilotRequest, tenantId: string): Promise<CopilotResponse> {
  const newMinimum = parseEuroAmount(request.message);
  if (!newMinimum) {
    return {
      intent: 'what_if',
      message: 'I could not detect the new threshold amount. Try phrasing like: "What if minimum investment changed to �200K?"',
    };
  }

  const fund = await resolveFundForWhatIf(tenantId, request.context, request.message);
  if (!fund) {
    return {
      intent: 'what_if',
      message: 'No fund structures are available to run this scenario.',
    };
  }

  const impacted = await query<InvestorImpactRow>(
    `SELECT i.id,
            i.name,
            COALESCE(SUM(h.units * COALESCE(a.unit_price, 0)), 0)::numeric AS invested_eur
     FROM investors i
     LEFT JOIN holdings h ON h.investor_id = i.id
     LEFT JOIN assets a ON a.id = h.asset_id AND a.fund_structure_id = $1
     WHERE i.tenant_id = $2
     GROUP BY i.id, i.name
     HAVING COALESCE(SUM(h.units * COALESCE(a.unit_price, 0)), 0) < $3
     ORDER BY invested_eur ASC`,
    [fund.id, tenantId, newMinimum]
  );

  let blockedTransfers = 0;
  if (impacted.length > 0) {
    const params: (string | number)[] = [fund.id, tenantId];
    const placeholders: string[] = [];
    for (let index = 0; index < impacted.length; index++) {
      params.push(impacted[index].id);
      placeholders.push(`$${index + 3}`);
    }

    const transferRows = await query<CountRow>(
      `SELECT COUNT(*)::int AS count
       FROM transfers t
       JOIN assets a ON a.id = t.asset_id
       WHERE a.fund_structure_id = $1
         AND a.tenant_id = $2
         AND t.to_investor_id IN (${placeholders.join(', ')})`,
      params
    );

    blockedTransfers = transferRows[0]?.count || 0;
  }

  const sample = impacted.slice(0, 5)
    .map(row => `- ${row.name}: �${Number(row.invested_eur).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
    .join('\n');

  const details = sample
    ? `\n\nExamples below threshold:\n${sample}`
    : '';

  return {
    intent: 'what_if',
    message: `If ${fund.name} minimum investment is set to �${newMinimum.toLocaleString()}, ${impacted.length} investors would fail eligibility and approximately ${blockedTransfers} historical transfers would be blocked under the same threshold.${details}`,
    suggestedActions: [
      {
        label: 'Review Eligibility Criteria',
        action: 'navigate',
        payload: { path: `/funds/${fund.id}` },
      },
    ],
  };
}

export async function chat(request: CopilotRequest, tenantId: string, userId?: string): Promise<CopilotResponse> {
  const sanitized = sanitizeMessage(request.message || '');
  if (!sanitized) {
    throw new ValidationError('Invalid request');
  }

  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;

  if (userId) {
    await enforceRateLimit(scopedTenantId, userId);
  }

  const intent = await classifyIntent(sanitized);

  let response: CopilotResponse;

  if (intent === 'explain_decision') {
    response = await handleExplainDecision(sanitized, scopedTenantId);
  } else if (intent === 'draft_rule') {
    response = await handleDraftRule({ ...request, message: sanitized }, scopedTenantId);
  } else if (intent === 'what_if') {
    response = await handleWhatIf({ ...request, message: sanitized }, scopedTenantId);
  } else {
    response = await handleRegulatoryQa(sanitized, scopedTenantId);
  }

  const entityType: EntityType = isEntityType(request.context?.selectedEntityType)
    ? request.context!.selectedEntityType as EntityType
    : 'regulatory_document';

  const entityId = extractUuid(request.context?.selectedEntityId || '') || DEFAULT_TENANT_ID;

  await createEvent({
    event_type: 'copilot.query',
    entity_type: entityType,
    entity_id: entityId,
    tenant_id: scopedTenantId,
    payload: {
      intent: response.intent,
      message_length: sanitized.length,
      response_length: response.message.length,
      user_id: userId || null,
      current_page: request.context?.currentPage || null,
    },
  });

  return response;
}
