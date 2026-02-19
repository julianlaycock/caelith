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
  NLRuleResponse,
  CopilotResponse,
  DecisionExplanation,
  ScenarioResult,
  BulkImportPayload,
  BulkImportResult,
  CsvParseResult,
  RulePackInfo,
  ApplyRulePackResult,
  AnnexIVReport,
  InvestorDocument,
} from './types';

const resolveBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // Browser-side: hit the same origin (Next.js rewrite proxies to the backend)
    return '/api';
  }

  // Server-side (SSR / pre-render) still needs a concrete host
  return process.env.NEXT_PUBLIC_SSR_API_URL ?? 'http://localhost:3001/api';
};

const BASE_URL = resolveBaseUrl();

class ApiClient {
  private token: string | null = null;
  private static readonly DEFAULT_TIMEOUT_MS = 30_000;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async downloadFile(path: string, filename: string, errorMsg: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(errorMsg);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async downloadCapTablePdf(assetId: string): Promise<void> {
    return this.downloadFile(
      `/holdings/cap-table/${assetId}/pdf`,
      `cap-table-${assetId.substring(0, 8)}.pdf`,
      'PDF download failed'
    );
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
        const errorBody = await response.json().catch(() => ({
          error: 'UNAUTHORIZED',
          message: 'Session expired',
        }));

        // Only treat as session expiry for non-auth endpoints
        if (!path.startsWith('/auth/')) {
          this.token = null;
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        throw errorBody as ApiError;
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

  async getTransferHistory(assetId?: string): Promise<TransferHistoryEntry[]> {
    if (assetId) {
      return this.request<TransferHistoryEntry[]>(`/transfers/history/${assetId}`);
    }
    return this.request<TransferHistoryEntry[]>('/transfers/history');
  }

  async getPendingTransfers(): Promise<Transfer[]> {
    return this.request<Transfer[]>('/transfers/pending');
  }

  async approveTransfer(id: string): Promise<Transfer> {
    return this.request<Transfer>(`/transfers/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectTransfer(id: string, reason: string): Promise<Transfer> {
    return this.request<Transfer>(`/transfers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
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

  async applyToFund(data: {
    investor_id: string;
    asset_id: string;
    requested_units: number;
    owner_tag?: string;
    handoff_notes?: string;
  }): Promise<OnboardingRecord> {
    return this.request<OnboardingRecord>('/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOnboardingHandoff(id: string, data: { owner_tag?: string; handoff_notes?: string }): Promise<OnboardingRecord> {
    return this.request<OnboardingRecord>(`/onboarding/${id}/handoff`, {
      method: 'PATCH',
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

  async downloadDecisionEvidenceBundle(decisionId: string): Promise<void> {
    return this.downloadFile(
      `/decisions/${decisionId}/evidence.pdf`,
      `decision-evidence-${decisionId.substring(0, 8)}.pdf`,
      'Decision evidence export failed'
    );
  }

  // 🧠 Decision Explanation
  async explainDecision(decisionId: string): Promise<DecisionExplanation> {
    return this.request<DecisionExplanation>(`/decisions/${decisionId}/explain`);
  }

  // 🔮 Scenario Modeling
  async analyzeScenarioImpact(data: {
    fund_structure_id: string;
    proposed_changes: {
      minimum_investment?: number;
      investor_types_allowed?: string[];
      jurisdiction_whitelist?: string[];
    };
  }): Promise<ScenarioResult> {
    return this.request<ScenarioResult>('/scenarios/impact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    return this.downloadFile(
      `/reports/compliance/${fundStructureId}/pdf`,
      `compliance-report-${fundStructureId.substring(0, 8)}.pdf`,
      'PDF download failed'
    );
  }

  // ── NL Rule Compiler ──────────────────────────────────
  async compileNaturalLanguageRule(description: string, assetId: string): Promise<NLRuleResponse> {
    return this.request<NLRuleResponse>('/nl-rules/from-natural-language', {
      method: 'POST',
      body: JSON.stringify({ description, asset_id: assetId }),
    });
  }

  // ── Copilot ───────────────────────────────────────────
  async copilotChat(
    message: string,
    context?: { currentPage?: string; selectedEntityId?: string; selectedEntityType?: string }
  ): Promise<CopilotResponse> {
    return this.request<CopilotResponse>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async copilotFeedback(messageId: string, rating: 'up' | 'down'): Promise<void> {
    await this.request<void>('/copilot/feedback', {
      method: 'POST',
      body: JSON.stringify({ messageId, rating }),
    });
  }

  // ── Bulk Import ──────────────────────────────────────
  async bulkImport(payload: BulkImportPayload): Promise<BulkImportResult> {
    return this.request<BulkImportResult>('/import/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── CSV Import ────────────────────────────────────────
  async parseCsv(file: File, entityType: string): Promise<CsvParseResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    const url = `${BASE_URL}/import/parse-csv`;
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'UNKNOWN', message: 'CSV parse failed' }));
      throw err as ApiError;
    }
    return res.json() as Promise<CsvParseResult>;
  }

  async importCsv(
    file: File,
    entityType: string,
    columnMapping: Record<string, string>,
    mode: 'strict' | 'best_effort' = 'strict',
  ): Promise<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('columnMapping', JSON.stringify(columnMapping));
    formData.append('mode', mode);

    const url = `${BASE_URL}/import/csv`;
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'UNKNOWN', message: 'CSV import failed' }));
      throw err as ApiError;
    }
    return res.json() as Promise<BulkImportResult>;
  }

  // ── Rule Packs ──────────────────────────────────────
  async getRulePacks(): Promise<RulePackInfo[]> {
    return this.request<RulePackInfo[]>('/rule-packs');
  }

  async applyRulePack(fundStructureId: string, legalForm?: string): Promise<ApplyRulePackResult> {
    return this.request<ApplyRulePackResult>('/rule-packs/apply', {
      method: 'POST',
      body: JSON.stringify({ fund_structure_id: fundStructureId, legal_form: legalForm }),
    });
  }

  // ── Annex IV Reporting ─────────────────────────────
  async getAnnexIVReport(fundStructureId: string): Promise<AnnexIVReport> {
    return this.request<AnnexIVReport>(`/reports/annex-iv/${fundStructureId}`);
  }

  async downloadAnnexIVXml(fundStructureId: string): Promise<void> {
    return this.downloadFile(
      `/reports/annex-iv/${fundStructureId}/xml`,
      `annex-iv-${fundStructureId.substring(0, 8)}.xml`,
      'Annex IV XML download failed'
    );
  }

  // ── Evidence Bundle ────────────────────────────────
  async downloadEvidenceBundle(fundStructureId: string): Promise<void> {
    return this.downloadFile(
      `/reports/evidence-bundle/${fundStructureId}`,
      `evidence-bundle-${fundStructureId.substring(0, 8)}.json`,
      'Evidence bundle download failed'
    );
  }

  // ── Investor Documents (KYC) ──────────────────────
  async getInvestorDocuments(investorId: string): Promise<InvestorDocument[]> {
    return this.request<InvestorDocument[]>(`/investor-documents/${investorId}`);
  }

  async uploadInvestorDocument(
    investorId: string,
    file: File,
    documentType: string,
    options?: { expiry_date?: string; notes?: string }
  ): Promise<InvestorDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (options?.expiry_date) formData.append('expiry_date', options.expiry_date);
    if (options?.notes) formData.append('notes', options.notes);

    const url = `${BASE_URL}/investor-documents/${investorId}/upload`;
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'UNKNOWN', message: 'Upload failed' }));
      throw err as ApiError;
    }
    return res.json() as Promise<InvestorDocument>;
  }

  async downloadInvestorDocument(documentId: string, filename: string): Promise<void> {
    return this.downloadFile(
      `/investor-documents/file/${documentId}`,
      filename,
      'Document download failed'
    );
  }

  async verifyInvestorDocument(documentId: string): Promise<InvestorDocument> {
    return this.request<InvestorDocument>(`/investor-documents/file/${documentId}/verify`, {
      method: 'PATCH',
    });
  }

  async rejectInvestorDocument(documentId: string): Promise<InvestorDocument> {
    return this.request<InvestorDocument>(`/investor-documents/file/${documentId}/reject`, {
      method: 'PATCH',
    });
  }

  async deleteInvestorDocument(documentId: string): Promise<void> {
    await this.request(`/investor-documents/file/${documentId}`, { method: 'DELETE' });
  }

  /** @deprecated Use downloadTemplate() for authenticated downloads */
  getTemplateDownloadUrl(entityType: string): string {
    return `${BASE_URL}/import/templates/${entityType}`;
  }

  async downloadTemplate(entityType: string): Promise<void> {
    return this.downloadFile(
      `/import/templates/${entityType}`,
      `${entityType}-template.csv`,
      'Template download failed'
    );
  }
}

export const api = new ApiClient();
