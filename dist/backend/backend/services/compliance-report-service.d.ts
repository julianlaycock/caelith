/**
 * Compliance Report Service — Slice 6
 *
 * Generates a fund-level compliance status snapshot:
 *   - Fund structure details
 *   - Eligibility criteria in force
 *   - Investor breakdown (by type, jurisdiction, KYC status)
 *   - Onboarding pipeline (by status)
 *   - Recent decision records (audit trail)
 *   - Concentration / risk flags
 *
 * Single endpoint, single fund, comprehensive view.
 */
export interface ComplianceReport {
    generated_at: string;
    fund: FundSummary;
    eligibility_criteria: CriteriaSummary[];
    investor_breakdown: InvestorBreakdown;
    onboarding_pipeline: OnboardingPipeline;
    recent_decisions: DecisionSummary[];
    risk_flags: RiskFlag[];
}
interface FundSummary {
    id: string;
    name: string;
    legal_form: string;
    domicile: string;
    status: string;
    regulatory_framework: string | null;
    assets: AssetSummary[];
    total_aum_units: number;
    total_allocated_units: number;
    utilization_pct: number;
    total_investors: number;
}
interface AssetSummary {
    id: string;
    name: string;
    asset_type: string;
    total_units: number;
    allocated_units: number;
    unit_price: number | null;
    holder_count: number;
}
interface CriteriaSummary {
    investor_type: string;
    jurisdiction: string;
    minimum_investment_eur: number;
    suitability_required: boolean;
    source_reference: string | null;
}
interface InvestorBreakdown {
    by_type: {
        type: string;
        count: number;
        total_units: number;
    }[];
    by_jurisdiction: {
        jurisdiction: string;
        count: number;
        total_units: number;
    }[];
    by_kyc_status: {
        status: string;
        count: number;
    }[];
    kyc_expiring_within_90_days: {
        investor_id: string;
        investor_name: string;
        kyc_expiry: string;
    }[];
}
interface OnboardingPipeline {
    total: number;
    by_status: {
        status: string;
        count: number;
    }[];
    recent: {
        id: string;
        investor_name: string;
        asset_name: string;
        status: string;
        requested_units: number;
        applied_at: string;
    }[];
}
interface DecisionSummary {
    id: string;
    decision_type: string;
    result: string;
    subject_id: string | null;
    asset_id: string;
    decided_at: string;
    decided_by: string | null;
    violation_count: number;
}
interface RiskFlag {
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
}
export declare function generateComplianceReport(fundStructureId: string): Promise<ComplianceReport>;
export {};
//# sourceMappingURL=compliance-report-service.d.ts.map