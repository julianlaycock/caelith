import { setTimeout as delay } from 'timers/promises';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

type EmbeddingProvider = 'openai' | 'anthropic';

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
}

function getProvider(): EmbeddingProvider {
  const explicit = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase();
  if (explicit === 'openai' || explicit === 'anthropic') {
    return explicit;
  }
  if (!explicit && !process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (!explicit || explicit === 'openai') {
    return 'openai';
  }
  throw new Error(`Unsupported EMBEDDING_PROVIDER: ${explicit}`);
}

function getApiKey(provider: EmbeddingProvider): string {
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai. ' +
        'Set it in .env or use EMBEDDING_PROVIDER=anthropic with ANTHROPIC_API_KEY.'
      );
    }
    return apiKey;
  }

  const apiKey = process.env.VOYAGE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'VOYAGE_API_KEY (or ANTHROPIC_API_KEY) is required when EMBEDDING_PROVIDER=anthropic. ' +
      'Voyage AI embeddings require a separate API key from api.voyageai.com. ' +
      'Set VOYAGE_API_KEY in .env, or use EMBEDDING_PROVIDER=openai with OPENAI_API_KEY.'
    );
  }
  return apiKey;
}

class HttpEmbeddingService implements EmbeddingService {
  private readonly provider: EmbeddingProvider;
  private readonly apiKey: string;

  constructor() {
    this.provider = getProvider();
    this.apiKey = getApiKey(this.provider);
  }

  getDimensions(): number {
    return this.provider === 'openai' ? 1536 : 1024;
  }

  async embed(text: string): Promise<number[]> {
    const cleaned = sanitizeText(text);
    if (!cleaned) {
      return new Array(this.getDimensions()).fill(0);
    }

    const batches = await this.embedBatch([cleaned]);
    return batches[0] || new Array(this.getDimensions()).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const cleanedTexts = texts.map(sanitizeText).filter(Boolean);
    if (cleanedTexts.length === 0) {
      return [];
    }

    if (this.provider === 'openai') {
      return this.embedOpenAI(cleanedTexts);
    }
    return this.embedVoyage(cleanedTexts);
  }

  private async embedOpenAI(texts: string[]): Promise<number[][]> {
    const response = await this.fetchWithRetry<OpenAIEmbeddingResponse>(
      'https://api.openai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      }
    );

    return response.data.map(item => item.embedding);
  }

  private async embedVoyage(texts: string[]): Promise<number[][]> {
    const response = await this.fetchWithRetry<VoyageEmbeddingResponse>(
      'https://api.voyageai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: texts,
        }),
      }
    );

    return response.data.map(item => item.embedding);
  }

  private async fetchWithRetry<T>(url: string, init: RequestInit): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          const isRetryable = response.status === 429 || response.status >= 500;

          if (isRetryable && attempt < MAX_RETRIES - 1) {
            const backoffMs = Math.min(8000, 400 * 2 ** attempt) + Math.floor(Math.random() * 150);
            await delay(backoffMs);
            continue;
          }

          throw new Error(`Embedding API error ${response.status}: ${body.slice(0, 300)}`);
        }

        return await response.json() as T;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Unknown embedding request error');

        const isAbort = lastError.name === 'AbortError';
        if ((isAbort || attempt < MAX_RETRIES - 1) && attempt < MAX_RETRIES - 1) {
          const backoffMs = Math.min(8000, 400 * 2 ** attempt) + Math.floor(Math.random() * 150);
          await delay(backoffMs);
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error('Embedding request failed');
  }
}

export function createEmbeddingService(): EmbeddingService {
  return new HttpEmbeddingService();
}
