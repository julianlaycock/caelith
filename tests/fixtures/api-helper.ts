import { API_BASE } from './test-data';

let authToken: string;

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json();
  if (!res.ok) throw { status: res.status, ...body };
  return body as T;
}

export async function ensureAuth(): Promise<void> {
  try {
    const result = await api<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@caelith.dev',
        password: 'test12345',
        name: 'Test Admin',
        role: 'admin',
      }),
    });
    authToken = result.token;
  } catch {
    const result = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@caelith.dev',
        password: 'test12345',
      }),
    });
    authToken = result.token;
  }
}

/**
 * Reset DB for e2e tests. Requires backend running with NODE_ENV=test ENABLE_TEST_RESET=1.
 * Throws descriptive error if reset endpoint is disabled.
 */
export async function resetDb(): Promise<void> {
  await ensureAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST', headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { message?: string }));
    const detail = typeof body.message === 'string' ? ` (${body.message})` : '';
    throw new Error(
      `Reset endpoint is disabled outside test mode${detail}. ` +
      `Start backend with: NODE_ENV=test ENABLE_TEST_RESET=1 npm run dev:backend`
    );
  }
}
