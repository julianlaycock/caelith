import type {
  Asset,
  CreateAssetRequest,
  AssetUtilization,
  Investor,
  CreateInvestorRequest,
  UpdateInvestorRequest,
  Holding,
  CreateHoldingRequest,
  CapTableEntry,
  RuleSet,
  CreateRuleSetRequest,
  Transfer,
  TransferRequest,
  TransferHistoryEntry,
  DetailedValidationResult,
  Event,
  ApiError,
  AuthResult,
  CompositeRule,
  CreateCompositeRuleRequest,
  RuleVersion,
  FundStructure,
  CreateFundStructureRequest,
  ComplianceReport,
  EligibilityResult,
  OnboardingRecord,
  OnboardingEligibilityResult,
  OnboardingReviewResult,
  DecisionRecord,
  DecisionChainVerificationResult,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;
  private static readonly DEFAULT_TIMEOUT_MS = 30_000;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async downloadCapTablePdf(assetId: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${BASE_URL}/holdings/cap-table/${assetId}/pdf`, { headers });
    if (!res.ok) throw new Error('PDF download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cap-table-${assetId.substring(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ApiClient.DEFAULT_TIMEOUT_MS);

    const config: RequestInit = {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    };

    try {
      const response = await fetch(url, config);

      clearTimeout(timeoutId);

      if (response.status === 401) {
        this.token = null;
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw { error: 'UNAUTHORIZED', message: 'Session expired' } as ApiError;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({
          error: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw errorBody as ApiError;
      }

      return response.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw { error: 'TIMEOUT', message: 'Request timed out' } as ApiError;
      }
      throw err;
    }
  }

  // ── Auth ──────────────────────────────────────────────────

  async register(email: string, password: string, name: string, role?: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    this.token = result.token;
    return result;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.token;
    return result;
  }

  logout(): void {
    this.token = null;
  }

  // ── Assets ──────────────────────────────────────────────

  async createAsset(data: CreateAssetRequest): Promise<Asset> {
    return this.request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAssets(): Promise<Asset[]> {
    return this.request<Asset[]>('/assets');
  }

  async getAsset(id: string): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`);
  }

  async getAssetUtilization(id: string): Promise<AssetUtilization> {
    return this.request<AssetUtilization>(`/assets/${id}/utilization`);
  }

  async updateAsset(id: string, data: { name?: string; asset_type?: string; total_units?: number }): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.request(`/assets/${id}`, { method: 'DELETE' });
  }

  // ── Investors ─────────────────────────────────────────

  async createInvestor(data: CreateInvestorRequest): Promise<Investor> {
    return this.request<Investor>('/investors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvestors(): Promise<Investor[]> {
    return this.request<Investor[]>('/investors');
  }

  async getInvestor(id: string): Promise<Investor> {
    return this.request<Investor>(`/investors/${id}`);
  }

  async updateInvestor(id: string, data: UpdateInvestorRequest): Promise<Investor> {
    return this.request<Investor>(`/investors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Holdings ──────────────────────────────────────────

  async allocateHolding(data: CreateHoldingRequest): Promise<Holding> {
    return this.request<Holding>('/holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHoldingsByAsset(assetId: string): Promise<Holding[]> {
    return this.request<Holding[]>(`/holdings?assetId=${assetId}`);
  }

  async getHoldingsByInvestor(investorId: string): Promise<Holding[]> {
    return this.request<Holding[]>(`/holdings?investorId=${investorId}`);
  }

  async getCapTable(assetId: string): Promise<CapTableEntry[]> {
    return this.request<CapTableEntry[]>(`/holdings/cap-table/${assetId}`);
  }

  // ── Rules ─────────────────────────────────────────────

  async createRules(data: CreateRuleSetRequest): Promise<RuleSet> {
    return this.request<RuleSet>('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRules(assetId: string): Promise<RuleSet> {
    return this.request<RuleSet>(`/rules/${assetId}`);
  }

  async getRuleVersions(assetId: string): Promise<RuleVersion[]> {
    return this.request<RuleVersion[]>(`/rules/${assetId}/versions`);
  }

  // ── Composite Rules ─────────────────────────────────

  async getCompositeRules(assetId: string): Promise<CompositeRule[]> {
    return this.request<CompositeRule[]>(`/composite-rules?assetId=${assetId}`);
  }

  async createCompositeRule(data: CreateCompositeRuleRequest): Promise<CompositeRule> {
    return this.request<CompositeRule>('/composite-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompositeRule(id: string, data: Partial<CreateCompositeRuleRequest>): Promise<void> {
    await this.request(`/composite-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCompositeRule(id: string): Promise<void> {
    await this.request(`/composite-rules/${id}`, { method: 'DELETE' });
  }

  // ── Transfers ─────────────────────────────────────────

  async simulateTransfer(data: TransferRequest): Promise<DetailedValidationResult> {
    return this.request<DetailedValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async executeTransfer(data: TransferRequest): Promise<Transfer> {
    return this.request<Transfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransfers(assetId?: string): Promise<Transfer[]> {
    const query = assetId ? `?assetId=${assetId}` : '';
    return this.request<Transfer[]>(`/transfers${query}`);
  }

  async getTransferHistory(assetId: string): Promise<TransferHistoryEntry[]> {
    return this.request<TransferHistoryEntry[]>(`/transfers/history/${assetId}`);
  }

  // ── Events ────────────────────────────────────────────

  async getEvents(params?: {
    entityType?: string;
    entityId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<Event[]> {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.eventType) searchParams.set('eventType', params.eventType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<Event[]>(`/events${query ? `?${query}` : ''}`);
  }

  // ── Fund Structures ───────────────────────────────────

  async getFundStructures(): Promise<FundStructure[]> {
    return this.request<FundStructure[]>('/fund-structures');
  }

  async getFundStructure(id: string): Promise<FundStructure> {
    return this.request<FundStructure>(`/fund-structures/${id}`);
  }

  async createFundStructure(data: CreateFundStructureRequest): Promise<FundStructure> {
    return this.request<FundStructure>('/fund-structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Compliance Reports ─────────────────────────────────

  async getComplianceReport(fundStructureId: string): Promise<ComplianceReport> {
    return this.request<ComplianceReport>(`/reports/compliance/${fundStructureId}`);
  }

  // ── Eligibility ────────────────────────────────────────

  async checkEligibility(data: { investor_id: string; fund_structure_id: string; investment_amount?: number }): Promise<EligibilityResult> {
    return this.request<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Onboarding ─────────────────────────────────────────

  async getOnboardingRecords(params?: { asset_id?: string; investor_id?: string }): Promise<OnboardingRecord[]> {
    const searchParams = new URLSearchParams();
    if (params?.asset_id) searchParams.set('asset_id', params.asset_id);
    if (params?.investor_id) searchParams.set('investor_id', params.investor_id);
    const query = searchParams.toString();
    return this.request<OnboardingRecord[]>(`/onboarding${query ? `?${query}` : ''}`);
  }

  async getOnboardingRecord(id: string): Promise<OnboardingRecord> {
    return this.request<OnboardingRecord>(`/onboarding/${id}`);
  }

  async applyToFund(data: { investor_id: string; asset_id: string; requested_units: number }): Promise<OnboardingRecord> {
    return this.request<OnboardingRecord>('/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkOnboardingEligibility(id: string): Promise<OnboardingEligibilityResult> {
    return this.request<OnboardingEligibilityResult>(`/onboarding/${id}/check-eligibility`, {
      method: 'POST',
    });
  }

  async reviewOnboarding(id: string, data: { decision: 'approved' | 'rejected'; rejection_reasons?: string[] }): Promise<OnboardingReviewResult> {
    return this.request<OnboardingReviewResult>(`/onboarding/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async allocateOnboarding(id: string): Promise<OnboardingRecord> {
    return this.request<OnboardingRecord>(`/onboarding/${id}/allocate`, {
      method: 'POST',
    });
  }

  // ── Decision Records ───────────────────────────────────

  async getDecisions(params?: { decision_type?: string; result?: string; limit?: number; offset?: number }): Promise<{ decisions: DecisionRecord[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.decision_type) searchParams.set('decision_type', params.decision_type);
    if (params?.result) searchParams.set('result', params.result);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return this.request<{ decisions: DecisionRecord[]; total: number; limit: number; offset: number }>(`/decisions${query ? `?${query}` : ''}`);
  }

  async getDecisionsByAsset(assetId: string): Promise<DecisionRecord[]> {
    return this.request<DecisionRecord[]>(`/decisions/asset/${assetId}`);
  }

  async getDecisionsByInvestor(investorId: string): Promise<DecisionRecord[]> {
    return this.request<DecisionRecord[]>(`/decisions/investor/${investorId}`);
  }

  async getDecision(id: string): Promise<DecisionRecord> {
    return this.request<DecisionRecord>(`/decisions/${id}`);
  }

  async verifyDecisionChain(limit?: number): Promise<DecisionChainVerificationResult> {
    const searchParams = new URLSearchParams();
    if (typeof limit === 'number') searchParams.set('limit', String(limit));
    const query = searchParams.toString();
    return this.request<DecisionChainVerificationResult>(`/decisions/verify-chain${query ? `?${query}` : ''}`);
  }

  async updateFundStructure(id: string, data: Partial<CreateFundStructureRequest>): Promise<FundStructure> {
    return this.request<FundStructure>(`/fund-structures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFundStructure(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request<{ deleted: boolean; id: string }>(`/fund-structures/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadComplianceReportPdf(fundStructureId: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${BASE_URL}/reports/compliance/${fundStructureId}/pdf`, { headers });
    if (!res.ok) throw new Error('PDF download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${fundStructureId.substring(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
