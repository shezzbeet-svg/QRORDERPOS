import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  });
});
