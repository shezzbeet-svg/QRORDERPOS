import { v4 as uuidv4 } from 'uuid';
import { API_ROOT, refreshSession } from './authClient';
import { useAuth } from '../hooks/useAuth';

export const clientUuid = (() => {
  if (typeof window === 'undefined') return 'server-client';
  let id = window.localStorage.getItem('client_uuid');
  if (!id) {
    id = uuidv4();
    window.localStorage.setItem('client_uuid', id);
  }
  return id;
})();

export async function apiFetch<T>(merchant: string, path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_ROOT}/api/merchants/${merchant}${normalizedPath}`;
  const state = useAuth.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-UUID': clientUuid,
    ...(options.headers as Record<string, string> | undefined)
  };
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = uuidv4();
  }
  if (state.accessToken) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  }
  const fetchOptions: RequestInit = { ...options, headers };
  (options as any).headers = headers; // ensure offline queue preserves idempotency headers

  const execute = () => fetch(url, fetchOptions);
  let res = await execute();
  if (res.status === 401 && state.refreshToken) {
    try {
      const refreshed = await refreshSession(state.refreshToken, clientUuid);
      useAuth.getState().setSession({
        accessToken: refreshed.tokens.accessToken,
        refreshToken: refreshed.tokens.refreshToken,
        user: refreshed.user,
        merchant: refreshed.merchant
      });
      headers['Authorization'] = `Bearer ${refreshed.tokens.accessToken}`;
      res = await execute();
    } catch (err) {
      useAuth.getState().logout();
      throw err;
    }
  }
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}
