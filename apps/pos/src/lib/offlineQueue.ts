import { getClientDb, type SerializedRequest } from './db';

export type OutboxItem = SerializedRequest;

function normaliseHeaders(headers?: RequestInit['headers']): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...(headers as Record<string, string>) };
}

export function createOutboxItem(params: {
  id: string;
  merchant: string;
  url: string;
  options: RequestInit;
  context?: string;
}): OutboxItem {
  const { id, merchant, url, options, context } = params;
  const method = (options.method || 'POST').toUpperCase();
  const headers = normaliseHeaders(options.headers);
  const body = typeof options.body === 'string' ? options.body : options.body == null ? undefined : String(options.body);
  return {
    id,
    merchant,
    url,
    method,
    headers,
    body,
    context,
    queuedAt: Date.now()
  };
}

export async function enqueue(item: OutboxItem) {
  const db = await getClientDb();
  await db.put('outbox', item);
}

export async function countOutbox() {
  const db = await getClientDb();
  const keys = await db.getAllKeys('outbox');
  return keys.length;
}

export async function getOutboxItems() {
  const db = await getClientDb();
  return db.getAll('outbox');
}

export async function flush(
  send: (item: OutboxItem) => Promise<void>,
  handlers?: {
    onSuccess?: (item: OutboxItem) => void;
    onError?: (item: OutboxItem, error: unknown) => void;
  }
) {
  const db = await getClientDb();
  const tx = db.transaction('outbox', 'readwrite');
  const store = tx.store;
  // eslint-disable-next-line no-restricted-syntax
  for await (const cursor of store) {
    const item = cursor.value as OutboxItem;
    try {
      await send(item);
      await cursor.delete();
      handlers?.onSuccess?.(item);
    } catch (error) {
      handlers?.onError?.(item, error);
    }
  }
  await tx.done;
}
