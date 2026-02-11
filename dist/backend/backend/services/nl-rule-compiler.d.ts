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
import { RuleCondition } from '../../rules-engine/types.js';
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
export declare function compileNaturalLanguageRule(request: NLRuleRequest): Promise<NLRuleResponse>;
//# sourceMappingURL=nl-rule-compiler.d.ts.map