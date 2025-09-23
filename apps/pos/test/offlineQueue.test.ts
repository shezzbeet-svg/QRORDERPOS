import { describe, it, expect, beforeEach, vi } from 'vitest';
codex/build-modular-frontend-for-restaurant-pos-yluvnu
import { createOutboxItem, enqueue, flush, countOutbox } from '../src/lib/offlineQueue';

const items = new Map<string, any>();

vi.mock('idb', async () => ({
  openDB: async () => ({
    put: (_store: string, value: any, key?: string) => {
      items.set(key ?? value.id, value);
    },
    getAllKeys: async () => Array.from(items.keys()),
    getAll: async () => Array.from(items.values()),
    transaction: () => ({
      store: {
        async *[Symbol.asyncIterator]() {
          for (const [key, value] of Array.from(items.entries())) {
            yield {
              value,
              delete: () => {
                items.delete(key);
              }
            } as any;
          }
        }
      },
      done: Promise.resolve()
    })
  })
}));

describe('offline queue', () => {
  beforeEach(() => {
    items.clear();
  });

  it('enqueues serialized requests and flushes them', async () => {
    const request = createOutboxItem({
      id: 'req-1',
      merchant: 'demo',
      url: '/orders',
      options: { method: 'POST', body: JSON.stringify({ foo: 'bar' }), headers: { 'Idempotency-Key': 'abc' } }
    });
    await enqueue(request);
    expect(await countOutbox()).toBe(1);

    const send = vi.fn().mockResolvedValue(undefined);
    await flush(async item => {
      expect(item).toMatchObject({
        id: 'req-1',
        merchant: 'demo',
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' })
      });
      await send(item);
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await countOutbox()).toBe(0);

import { enqueue, flush } from '../src/lib/offlineQueue';

vi.mock('idb', async () => {
  const items: any = new Map();
  return {
    openDB: async () => ({
      put: (_: string, item: any) => items.set(item.id, item),
      transaction: () => ({
        store: {
          async *[Symbol.asyncIterator]() {
            for (const id of Array.from(items.keys())) {
              yield { value: items.get(id), delete: () => items.delete(id) } as any;
            }
          }
        }
      })
    })
  };
});

describe('offline queue', () => {
  beforeEach(async () => {
    // reset mocked storage
  });

  it('enqueues and flushes', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await enqueue({ id: '1', merchant: 'm', url: '/x', options: { method: 'POST' } });
    await flush(send);
    expect(send).toHaveBeenCalled();
 main
  });
});
