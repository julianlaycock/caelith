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
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
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

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

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

  async getRuleVersions(assetId: string): Promise<Array<{ version: number; config: Record<string, unknown>; created_by: string | null; created_at: string }>> {
    return this.request(`/rules/${assetId}/versions`);
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
}

export const api = new ApiClient();