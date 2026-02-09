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
        email: 'test@codex.dev',
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
        email: 'test@codex.dev',
        password: 'test12345',
      }),
    });
    authToken = result.token;
  }
}

export async function resetDb(): Promise<void> {
  await ensureAuth();
  await api('/reset', { method: 'POST' });
}