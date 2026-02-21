/**
 * Shared Anthropic API Client
 *
 * Reusable wrapper around the Anthropic Messages API with retry logic,
 * timeout handling, and configuration. Used by copilot-service and
 * nl-rule-compiler.
 */

import { logger } from '../lib/logger.js';

export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

export interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface AnthropicResponse {
  content: AnthropicContentBlock[];
  stop_reason?: string;
}

/**
 * Check whether the Anthropic API key is configured.
 */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Call the Anthropic Messages API with automatic retry and timeout.
 *
 * Retries on 429 (rate-limit) and 5xx errors with exponential backoff.
 * Aborts individual requests after ANTHROPIC_TIMEOUT_MS.
 */
export async function callAnthropic(body: Record<string, unknown>): Promise<AnthropicResponse> {
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
        const retryable = (response.status === 429 || response.status >= 500) && response.status !== 401;

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
        logger.warn('Anthropic request failed, retrying', { attempt, error: lastError.message });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Anthropic request failed');
}
