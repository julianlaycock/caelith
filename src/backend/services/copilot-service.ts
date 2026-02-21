/**
 * Copilot Service v2 — Tool-Use Architecture
 *
 * Instead of hardcoded intent handlers, Claude gets the DB schema and a
 * read-only query tool. It decides what data it needs, fetches it, and
 * synthesizes a natural-language answer grounded in real data.
 */

import { createEvent } from '../repositories/event-repository.js';
import { DEFAULT_TENANT_ID, queryInTenantContext } from '../db.js';
import { ragService, RagResult } from './rag-service.js';
import { compileNaturalLanguageRule } from './nl-rule-compiler.js';
import type { EntityType } from '../models/index.js';
import { RateLimitError, ValidationError } from '../errors.js';
import { logger } from '../lib/logger.js';
import { callAnthropic, isAnthropicConfigured, ANTHROPIC_MODEL } from './anthropic-client.js';
import { stripPII } from './pii-stripper.js';

// ─── Types ───────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES: Set<EntityType> = new Set([
  'asset', 'investor', 'holding', 'rules', 'transfer', 'composite_rule',
  'fund_structure', 'eligibility_criteria', 'decision_record',
  'onboarding_record', 'regulatory_document',
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

interface CountRow { count: number; }

// ─── DB Schema (compact, injected into system prompt) ────────────────

const DB_SCHEMA = `
Tables (PostgreSQL, all tenant-scoped via tenant_id):

fund_structures: id, name, legal_form, domicile, regulatory_framework, aifm_name, aifm_lei, inception_date, target_size, currency, status, sfdr_classification, lmt_types(jsonb), leverage_limit_commitment, leverage_limit_gross, leverage_current_commitment, leverage_current_gross, liquidity_profile(jsonb), geographic_exposure(jsonb), counterparty_exposure(jsonb), created_at, deleted_at
assets: id, name, asset_type, total_units, unit_price, fund_structure_id(FK→fund_structures), created_at, deleted_at
investors: id, name, jurisdiction, accredited(bool), investor_type(retail/professional/semi_professional/institutional), kyc_status(pending/verified/expired/rejected), kyc_expiry, tax_id, lei, email, classification_date, classification_evidence(jsonb), classification_method, created_at, deleted_at
holdings: id, investor_id(FK), asset_id(FK), units, acquired_at
transfers: id, asset_id(FK), from_investor_id(FK), to_investor_id(FK), units, status(executed/pending/rejected), executed_at, decision_record_id(FK), approved_by, approved_at, rejection_reason, pending_reason
decision_records: id, decision_type, asset_id(FK), subject_id, input_snapshot(jsonb), rule_version_snapshot(jsonb), result(approved/rejected/pending), result_details(jsonb with checks[{rule,passed,message}]), decided_by, decided_at, sequence_number, integrity_hash, previous_hash
composite_rules: id, asset_id(FK), name, description, operator(AND/OR), conditions(jsonb), enabled(bool), severity(high/medium/low), jurisdiction, created_at
rules: id, asset_id(FK), version, qualification_required, lockup_days, jurisdiction_whitelist(jsonb), transfer_whitelist(jsonb), investor_type_whitelist(jsonb), minimum_investment, maximum_investors, concentration_limit_pct, kyc_required
eligibility_criteria: id, fund_structure_id(FK), jurisdiction, investor_type, minimum_investment, maximum_allocation_pct, documentation_required(jsonb), suitability_required, source_reference, effective_date, superseded_at
onboarding_records: id, investor_id(FK), asset_id(FK), status(applied/approved/rejected/pending_review), requested_units, eligibility_decision_id(FK), approval_decision_id(FK), reviewed_by, rejection_reasons(jsonb), applied_at, reviewed_at, owner_tag, handoff_notes
investor_documents: id, investor_id(FK), document_type, filename, mime_type, file_size, status(uploaded/verified/rejected/expired), expiry_date, notes, uploaded_by, verified_by, verified_at
events: id, event_type, entity_type, entity_id, payload(jsonb), timestamp
regulatory_documents: id, source_name, jurisdiction, framework, article_ref, chunk_index, content(text), document_title
fund_lmts: id, fund_structure_id(FK→fund_structures), lmt_type(redemption_gates/swing_pricing/anti_dilution_levy/side_pockets/notice_periods/redemption_in_kind/borrowing_arrangements), activation_threshold(text), activation_policy(text), status(configured/active/deactivated), last_activated_at, last_deactivated_at, nca_notified(bool), nca_notified_at, notes, created_at
fund_delegations: id, fund_structure_id(FK→fund_structures), delegate_name, delegate_lei, function_delegated(portfolio_management/risk_management/administration/distribution/valuation/it_infrastructure/compliance_monitoring), jurisdiction, start_date, oversight_frequency(monthly/quarterly/semi-annually/annually), last_review_date, next_review_date, status(active/under_review/terminated), letterbox_risk(low/medium/high), termination_clause, notes, created_at
aifmd_readiness_answers: id, question_key(text), status(yes/partial/no/na), notes(text), updated_at — stores per-question answers for AIFMD II readiness assessment; question_key maps to categories: annex_iv_reporting, audit_trail, compliance_calendar, lmt_framework, delegation_oversight, cost_transparency, depositary_arrangements, loan_origination
`.trim();

// ─── SQL Safety ──────────────────────────────────────────────────────

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b/i,
  /\b(pg_sleep|pg_terminate|pg_cancel|set\s+role|set\s+session|set\s+local)\b/i,
  /;\s*\S/,  // multiple statements
  /--/,      // SQL comments (potential injection)
  /\/\*/,    // block comments
];

function validateReadOnlySQL(sql: string): boolean {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (!trimmed.toUpperCase().startsWith('SELECT')) return false;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function sanitizeMessage(input: string): string {
  const withoutControls = Array.from(input).map((ch) => {
    const code = ch.charCodeAt(0);
    return (code >= 0 && code <= 31) || code === 127 ? ' ' : ch;
  }).join('');
  return withoutControls.replace(/\s+/g, ' ').trim();
}

function extractUuid(input: string): string | null {
  const match = input.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/);
  return match ? match[0] : null;
}

function isEntityType(value: string | undefined): value is EntityType {
  return value ? VALID_ENTITY_TYPES.has(value as EntityType) : false;
}

// ─── Rate Limit ──────────────────────────────────────────────────────

async function enforceRateLimit(tenantId: string, userId: string): Promise<void> {
  const rows = await queryInTenantContext<CountRow>(
    `SELECT COUNT(*)::int AS count FROM events
     WHERE tenant_id = $1 AND event_type = 'copilot.query'
       AND timestamp >= NOW() - INTERVAL '1 hour'
       AND payload->>'user_id' = $2`,
    [tenantId, userId],
    tenantId
  );
  if ((rows[0]?.count || 0) >= 30) {
    throw new RateLimitError('Rate limit exceeded');
  }
}

// ─── Tool-Use Copilot (the real thing) ───────────────────────────────

const MAX_TOOL_ROUNDS = 8;
const MAX_ROWS_RETURNED = 50;

const TOOLS = [
  {
    name: 'query_database',
    description: 'Execute a read-only SQL query against the tenant database. Returns up to 50 rows as JSON. Always filter by tenant_id. Use this to answer questions about funds, investors, compliance status, decisions, transfers, holdings, rules, onboarding, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string' as const,
          description: 'A read-only SELECT query. Must include tenant_id filter. No INSERT/UPDATE/DELETE/DDL.',
        },
        explanation: {
          type: 'string' as const,
          description: 'Brief explanation of what this query fetches and why.',
        },
      },
      required: ['sql', 'explanation'],
    },
  },
  {
    name: 'search_regulations',
    description: 'Search ingested regulatory documents (AIFMD II, KAGB, MiFID II, etc.) using semantic search. Use for regulatory/legal questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Natural language search query for regulatory content.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'draft_compliance_rule',
    description: 'Generate a compliance rule from a natural language description. Returns proposed rule JSON.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string' as const,
          description: 'Natural language description of the rule to create.',
        },
        asset_id: {
          type: 'string' as const,
          description: 'UUID of the asset/fund to attach the rule to.',
        },
      },
      required: ['description', 'asset_id'],
    },
  },
];

function buildSystemPrompt(tenantId: string, context?: CopilotRequest['context']): string {
  let contextInfo = '';
  if (context?.currentPage) {
    contextInfo += `\nUser is currently viewing: ${context.currentPage}`;
  }
  if (context?.selectedEntityId) {
    contextInfo += `\nSelected entity: ${context.selectedEntityType || 'unknown'} ${context.selectedEntityId}`;
  }

  return `You are the Caelith Compliance Copilot — an AI assistant embedded in a regulatory compliance platform for EU fund managers (AIFMD II, KAGB, MiFID II, ELTIF 2.0, AMLR).

You have direct access to the tenant's live database via the query_database tool. Use it to answer questions with real data — compliance scores, fund structures, investor status, risk flags, decisions, transfers, holdings, rules, onboarding records, and more.

TENANT_ID for all queries: '${tenantId}'

DATABASE SCHEMA:
${DB_SCHEMA}

GUIDELINES:
- Always filter queries with WHERE tenant_id = '${tenantId}' (and deleted_at IS NULL for soft-deleted tables: assets, investors, fund_structures, users).
- You can run multiple queries in sequence to build a comprehensive answer.
- Present data clearly with numbers, names, and specifics — not vague summaries.
- For compliance status: check decision_records (result: approved/rejected), composite_rules (enabled, severity), investor kyc_status, transfer status.
- For risk flags: look at rejected decisions, expired KYC, high-severity rules, pending transfers.
- When citing regulations, reference specific articles (e.g., "Art. 21 AIFMD II").
- Use search_regulations for questions about legal text / regulatory requirements.
- Use draft_compliance_rule when user wants to create a new rule.
- Keep answers concise but data-rich. Use markdown formatting.
- If a query returns no data, say so clearly rather than guessing.

AIFMD II CONTEXT (transposition deadline: April 16, 2026):
- fund_lmts: Liquidity Management Tools per fund. AIFMD II Art. 16 requires at least 2 LMTs configured per fund. Check status (active vs configured), NCA notification status.
- fund_delegations: Delegation arrangements per fund. AIFMD II Art. 20 tightens the "letterbox entity" test. High letterbox_risk delegations need enhanced oversight. Check next_review_date for overdue reviews.
- aifmd_readiness_answers: AIFMD II readiness self-assessment. Score = (yes*1 + partial*0.5) / applicable questions. Categories map to AIFMD II implementation areas.
- When asked about AIFMD II readiness, compliance gaps, or preparation status, query all three tables to give a comprehensive picture.
${contextInfo}

IMPORTANT: You have access to REAL, LIVE data. Never say "I don't have access to your data." Query the database instead.`;
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  tenantId: string
): Promise<string> {
  try {
    if (toolName === 'query_database') {
      const sql = String(toolInput.sql || '');
      if (!validateReadOnlySQL(sql)) {
        return JSON.stringify({ error: 'Query rejected: only read-only SELECT statements are allowed.' });
      }
      // Enforce tenant_id presence
      if (!sql.includes(tenantId)) {
        return JSON.stringify({ error: `Query must filter by tenant_id = '${tenantId}'.` });
      }
      let safeSql = sql.trim().replace(/;\s*$/, '');
      // Only add LIMIT if not already present
      if (!/\bLIMIT\b/i.test(safeSql)) {
        safeSql += ` LIMIT ${MAX_ROWS_RETURNED}`;
      }
      const rows = await queryInTenantContext(
        safeSql,
        [],
        tenantId
      );
      return JSON.stringify({ rows, count: rows.length });
    }

    if (toolName === 'search_regulations') {
      const query = String(toolInput.query || '');
      let results: RagResult[] = [];
      try {
        results = await ragService.query(query, { tenantId, topK: 5 });
      } catch {
        // RAG may be unavailable
      }
      if (results.length === 0) {
        return JSON.stringify({ results: [], note: 'No regulatory documents ingested. Answer from your training knowledge and note it is unverified.' });
      }
      return JSON.stringify({
        results: results.map(r => ({
          title: r.documentTitle,
          article: r.articleRef,
          content: r.content.slice(0, 500),
        })),
      });
    }

    if (toolName === 'draft_compliance_rule') {
      const description = String(toolInput.description || '');
      const assetId = String(toolInput.asset_id || '');
      const compiled = await compileNaturalLanguageRule({ description, asset_id: assetId });
      return JSON.stringify(compiled);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tool execution failed';
    logger.warn('Copilot tool execution error', { toolName, error: msg });
    return JSON.stringify({ error: msg });
  }
}

async function chatWithTools(
  message: string,
  tenantId: string,
  context?: CopilotRequest['context']
): Promise<CopilotResponse> {
  if (!isAnthropicConfigured()) {
    return {
      intent: 'error',
      message: 'The Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in the environment.',
    };
  }

  const systemPrompt = buildSystemPrompt(tenantId, context);
  const messages: Array<{ role: string; content: unknown }> = [
    { role: 'user', content: message },
  ];

  let finalText = '';
  let intent = 'general';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callAnthropic({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Collect any text blocks
    const textBlocks = response.content.filter((b: { type: string }) => b.type === 'text');
    const toolUseBlocks = response.content.filter((b: { type: string }) => b.type === 'tool_use');

    // If no tool calls, this is the final response — capture text
    if (toolUseBlocks.length === 0) {
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b: { text?: string }) => b.text || '').join('\n');
      }
      break;
    }

    // Tool calls present — any text here is just preamble, don't use as final answer

    // Detect intent from first tool use
    if (round === 0) {
      const firstTool = toolUseBlocks[0] as { name?: string };
      if (firstTool.name === 'query_database') intent = 'data_query';
      else if (firstTool.name === 'search_regulations') intent = 'regulatory_qa';
      else if (firstTool.name === 'draft_compliance_rule') intent = 'draft_rule';
    }

    // Add assistant message with all content blocks
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and build tool results
    const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];
    for (const block of toolUseBlocks) {
      const tb = block as { id?: string; name?: string; input?: Record<string, unknown> };
      logger.info('Copilot tool call', { tool: tb.name, input: tb.input });
      const result = await executeToolCall(
        tb.name || '',
        tb.input || {},
        tenantId
      );
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tb.id || '',
        content: result,
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) {
    finalText = 'I was unable to generate a response. Please try rephrasing your question.';
  }

  return {
    intent,
    message: finalText,
    citations: [],
    suggestedActions: [],
  };
}

// ─── Public API ──────────────────────────────────────────────────────

export async function chat(request: CopilotRequest, tenantId: string, userId?: string): Promise<CopilotResponse> {
  const sanitized = sanitizeMessage(request.message || '');
  if (!sanitized) {
    throw new ValidationError('Invalid request');
  }

  const scopedTenantId = tenantId || DEFAULT_TENANT_ID;

  if (userId) {
    await enforceRateLimit(scopedTenantId, userId);
  }

  const response = await chatWithTools(sanitized, scopedTenantId, request.context);

  // Log the query event
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
