/**
 * Natural Language Rule Compiler — Slice 3
 *
 * Converts natural language compliance requirements into structured
 * composite rules. Uses Claude API for interpretation, then validates
 * the generated rule deterministically.
 *
 * Key principles:
 * - AI proposes, human disposes (requires_approval = true always)
 * - Every generation is logged as a copilot.rule_proposed event
 * - Deterministic validator checks structural validity
 * - Confidence score reflects rule complexity and ambiguity
 */

import Anthropic from '@anthropic-ai/sdk';
import { CompositeRule, RuleCondition } from '../../rules-engine/types.js';
import { createEvent } from '../repositories/index.js';

// ── Types ───────────────────────────────────────────────────

export interface NLRuleRequest {
  description: string;
  asset_id: string;
  context?: {
    fund_legal_form?: string;
    fund_domicile?: string;
    fund_name?: string;
  };
}

export interface NLRuleResponse {
  proposed_rule: {
    name: string;
    description: string;
    operator: 'AND' | 'OR' | 'NOT';
    conditions: RuleCondition[];
    enabled: boolean;
  };
  confidence: number;
  explanation: string;
  source_suggestion: string | null;
  requires_approval: true;
  validation: {
    structurally_valid: boolean;
    errors: string[];
  };
}

// ── Valid Fields & Operators ────────────────────────────────

const VALID_FIELDS = [
  'from.jurisdiction', 'from.accredited', 'from.investor_type', 'from.kyc_status',
  'to.jurisdiction', 'to.accredited', 'to.investor_type', 'to.kyc_status',
  'transfer.units',
  'fund.legal_form', 'fund.domicile',
] as const;

const VALID_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'] as const;
const VALID_COMPOSITE_OPERATORS = ['AND', 'OR', 'NOT'] as const;

const VALID_INVESTOR_TYPES = ['institutional', 'professional', 'semi_professional', 'well_informed', 'retail'];
const VALID_KYC_STATUSES = ['pending', 'verified', 'expired', 'rejected'];
const VALID_LEGAL_FORMS = ['SICAV', 'SIF', 'RAIF', 'SCSp', 'SCA', 'ELTIF', 'Spezial_AIF', 'Publikums_AIF', 'QIAIF', 'RIAIF', 'LP', 'other'];

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a compliance rule compiler for Caelith, an AIFMD compliance platform.

Your job: convert natural language compliance requirements into structured JSON rules.

AVAILABLE FIELDS:
- from.jurisdiction (string, ISO 3166-1 alpha-2: "US", "DE", "LU", "IE", etc.)
- from.accredited (boolean)
- from.investor_type (string: "institutional", "professional", "semi_professional", "well_informed", "retail")
- from.kyc_status (string: "pending", "verified", "expired", "rejected")
- to.jurisdiction (same as from)
- to.accredited (same as from)
- to.investor_type (same as from)
- to.kyc_status (same as from)
- transfer.units (number, the number of units being transferred)
- fund.legal_form (string: "SICAV", "SIF", "RAIF", "SCSp", "SCA", "ELTIF", "Spezial_AIF", "Publikums_AIF", "QIAIF", "RIAIF", "LP", "other")
- fund.domicile (string, ISO 3166-1 alpha-2)

AVAILABLE OPERATORS:
- eq, neq (equality)
- gt, gte, lt, lte (numeric comparison)
- in, not_in (array membership — value must be a string array)

COMPOSITE OPERATORS:
- AND: all conditions must be true for the rule to PASS
- OR: at least one condition must be true for the rule to PASS
- NOT: the single condition must be FALSE for the rule to PASS

IMPORTANT: Rules define what is ALLOWED. If a user says "block retail investors", you need a rule where investor_type NOT equal to retail PASSES, meaning retail fails. Use the NOT operator or neq.

REGULATORY CONTEXT (use for source_suggestion):
- Luxembourg SIF: investor eligibility per SIF Law 13 Feb 2007
- Luxembourg RAIF: investor eligibility per Law of 23 July 2016
- ELTIF 2.0: Regulation 2023/606
- German Spezial-AIF: KAGB §1(19) Nr. 33
- Irish QIAIF: CBI AIF Rulebook, Chapter 2
- AIFMD II: Directive 2024/927

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "name": "short rule name",
  "description": "what this rule does",
  "operator": "AND" | "OR" | "NOT",
  "conditions": [
    { "field": "...", "operator": "...", "value": ... }
  ],
  "confidence": 0.0-1.0,
  "explanation": "plain language explanation",
  "source_suggestion": "regulatory reference or null"
}`;

// ── Claude API Call ─────────────────────────────────────────

async function callClaude(description: string, context?: NLRuleRequest['context']): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey });

  let userMessage = description;
  if (context) {
    const parts: string[] = [description];
    if (context.fund_legal_form) parts.push(`Fund type: ${context.fund_legal_form}`);
    if (context.fund_domicile) parts.push(`Fund domicile: ${context.fund_domicile}`);
    if (context.fund_name) parts.push(`Fund name: ${context.fund_name}`);
    userMessage = parts.join('\n');
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude API');
  }

  return textBlock.text;
}

// ── Deterministic Validator ─────────────────────────────────

function validateRuleStructure(rule: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!rule.name || typeof rule.name !== 'string') {
    errors.push('Missing or invalid "name" (must be string)');
  }
  if (!rule.description || typeof rule.description !== 'string') {
    errors.push('Missing or invalid "description" (must be string)');
  }
  if (!VALID_COMPOSITE_OPERATORS.includes(rule.operator)) {
    errors.push(`Invalid operator "${rule.operator}" (must be AND, OR, NOT)`);
  }
  if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
    errors.push('Missing or empty "conditions" array');
  }

  // NOT operator must have exactly 1 condition
  if (rule.operator === 'NOT' && Array.isArray(rule.conditions) && rule.conditions.length !== 1) {
    errors.push('NOT operator must have exactly 1 condition');
  }

  // Validate each condition
  if (Array.isArray(rule.conditions)) {
    rule.conditions.forEach((c: any, i: number) => {
      if (!VALID_FIELDS.includes(c.field)) {
        errors.push(`Condition ${i}: unknown field "${c.field}". Valid: ${VALID_FIELDS.join(', ')}`);
      }
      if (!VALID_OPERATORS.includes(c.operator)) {
        errors.push(`Condition ${i}: unknown operator "${c.operator}". Valid: ${VALID_OPERATORS.join(', ')}`);
      }
      if (c.value === undefined || c.value === null) {
        errors.push(`Condition ${i}: missing "value"`);
      }
      // Type-check value against operator
      if (['in', 'not_in'].includes(c.operator) && !Array.isArray(c.value)) {
        errors.push(`Condition ${i}: "in"/"not_in" operator requires array value`);
      }
      if (['gt', 'gte', 'lt', 'lte'].includes(c.operator) && typeof c.value !== 'number') {
        errors.push(`Condition ${i}: numeric operator requires number value`);
      }
      // Validate investor_type values
      if (c.field?.endsWith('.investor_type') && c.operator === 'eq' && !VALID_INVESTOR_TYPES.includes(c.value)) {
        errors.push(`Condition ${i}: invalid investor_type "${c.value}". Valid: ${VALID_INVESTOR_TYPES.join(', ')}`);
      }
      if (c.field?.endsWith('.investor_type') && ['in', 'not_in'].includes(c.operator) && Array.isArray(c.value)) {
        c.value.forEach((v: any) => {
          if (!VALID_INVESTOR_TYPES.includes(v)) {
            errors.push(`Condition ${i}: invalid investor_type "${v}" in array`);
          }
        });
      }
      // Validate kyc_status values
      if (c.field?.endsWith('.kyc_status') && c.operator === 'eq' && !VALID_KYC_STATUSES.includes(c.value)) {
        errors.push(`Condition ${i}: invalid kyc_status "${c.value}". Valid: ${VALID_KYC_STATUSES.join(', ')}`);
      }
      // Validate legal_form values
      if (c.field === 'fund.legal_form' && c.operator === 'eq' && !VALID_LEGAL_FORMS.includes(c.value)) {
        errors.push(`Condition ${i}: invalid legal_form "${c.value}". Valid: ${VALID_LEGAL_FORMS.join(', ')}`);
      }
    });
  }

  // Validate confidence
  if (rule.confidence !== undefined) {
    if (typeof rule.confidence !== 'number' || rule.confidence < 0 || rule.confidence > 1) {
      errors.push('Confidence must be a number between 0 and 1');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Public API ──────────────────────────────────────────────

export async function compileNaturalLanguageRule(
  request: NLRuleRequest
): Promise<NLRuleResponse> {
  // Call Claude
  const rawResponse = await callClaude(request.description, request.context);

  // Parse JSON (strip any accidental markdown fencing)
  let parsed: any;
  try {
    const cleaned = rawResponse.replace(/```json\n?|```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Log the failed attempt
    await createEvent({
      event_type: 'copilot.rule_proposed',
      entity_type: 'asset',
      entity_id: request.asset_id,
      payload: {
        input: request.description,
        context: request.context,
        raw_response: rawResponse,
        error: 'Failed to parse LLM response as JSON',
        success: false,
      },
    });

    throw new Error(`Failed to parse AI response as JSON. Raw: ${rawResponse.substring(0, 200)}`);
  }

  // Validate structure
  const validation = validateRuleStructure(parsed);

  // Build response
  const response: NLRuleResponse = {
    proposed_rule: {
      name: parsed.name || 'Unnamed rule',
      description: parsed.description || request.description,
      operator: parsed.operator || 'AND',
      conditions: parsed.conditions || [],
      enabled: true,
    },
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    explanation: parsed.explanation || 'No explanation provided',
    source_suggestion: parsed.source_suggestion || null,
    requires_approval: true,
    validation: {
      structurally_valid: validation.valid,
      errors: validation.errors,
    },
  };

  // Log the attempt (success or structural failure)
  await createEvent({
    event_type: 'copilot.rule_proposed',
    entity_type: 'asset',
    entity_id: request.asset_id,
    payload: {
      input: request.description,
      context: request.context,
      proposed_rule: response.proposed_rule,
      confidence: response.confidence,
      explanation: response.explanation,
      source_suggestion: response.source_suggestion,
      structurally_valid: validation.valid,
      validation_errors: validation.errors,
      success: true,
    },
  });

  return response;
}