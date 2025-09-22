'use client';
import { useEffect } from 'react';
import { enqueue, flush } from '../lib/offlineQueue';
import { apiFetch } from '../lib/api';

export function useOfflineSync(merchant: string) {
  useEffect(() => {
    navigator.serviceWorker?.addEventListener('message', () => {
      flush(item => apiFetch(item.merchant, item.url, item.options));
    });
    window.addEventListener('online', () => {
      flush(item => apiFetch(item.merchant, item.url, item.options));
    });
  }, [merchant]);

  return async function submit(url: string, options: RequestInit) {
    try {
      await apiFetch(merchant, url, options);
    } catch (err) {
      await enqueue({
        id: crypto.randomUUID(),
        merchant,
        url,
        options
      });
      navigator.serviceWorker?.ready.then(sw =>
        sw.sync.register('sync-outbox')
      );
    }
  };
}
