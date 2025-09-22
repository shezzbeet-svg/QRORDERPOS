import type { AuthUser, MerchantMeta } from '../hooks/useAuth';

export const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  refreshTokenTtlDays: number;
}

export interface AuthResponse {
  merchant: MerchantMeta;
  user: AuthUser;
  tokens: AuthTokens;
}

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function loginStaff(payload: { merchantSlug: string; code: string; pin: string; deviceId: string }): Promise<AuthResponse> {
  return jsonFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function refreshSession(refreshToken: string, deviceId: string): Promise<AuthResponse> {
  return jsonFetch<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken, deviceId })
  });
}

export function logoutSession(refreshToken?: string) {
  return jsonFetch<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
}
