import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  });
});
