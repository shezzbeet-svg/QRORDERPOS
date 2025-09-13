import { v4 as uuidv4 } from 'uuid';

const clientUuid = (() => {
  if (typeof localStorage === 'undefined') return 'server';
  let id = localStorage.getItem('client_uuid');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('client_uuid', id);
  }
  return id;
})();

export async function apiFetch<T>(merchant: string, path: string, options: RequestInit = {}): Promise<T> {
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
}
