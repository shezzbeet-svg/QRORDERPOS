import { v4 as uuidv4 } from 'uuid';
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
import { API_ROOT, refreshSession } from './authClient';
import { useAuth } from '../hooks/useAuth';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const clientUuid = (() => {
  if (typeof window === 'undefined') return 'server-client';
  let id = window.localStorage.getItem('client_uuid');
  if (!id) {
    id = uuidv4();
    window.localStorage.setItem('client_uuid', id);


const clientUuid = (() => {
  if (typeof localStorage === 'undefined') return 'server';
  let id = localStorage.getItem('client_uuid');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('client_uuid', id);
 main
  }
  return id;
})();

export async function apiFetch<T>(merchant: string, path: string, options: RequestInit = {}): Promise<T> {
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
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
  let res: Response;
  try {
    res = await execute();
  } catch (error) {
    throw error;
  }
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
    let message = res.statusText;
    let body: unknown;
    try {
      const text = await res.text();
      message = text || message;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = text;
      }
    } catch {
      // ignore parsing error
    }
    throw new ApiError(message, res.status, body);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text.length) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiError('Failed to parse response', res.status, text);
  }

  const idempotencyKey = uuidv4();
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-UUID': clientUuid,
    'Idempotency-Key': idempotencyKey,
    ...(options.headers || {})
  } as Record<string, string>;
  const res = await fetch(`/merchants/${merchant}${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
 main
}
