'use client';
codex/build-modular-frontend-for-restaurant-pos-yluvnu
import { useCallback, useEffect, useRef } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import { createOutboxItem, enqueue, flush, countOutbox } from '../lib/offlineQueue';
import { useSyncStatus } from './useSyncStatus';

export class OfflineQueuedError extends Error {
  requestId: string;

  constructor(requestId: string) {
    super('Request stored offline until connectivity is restored.');
    this.name = 'OfflineQueuedError';
    this.requestId = requestId;
  }
}

async function triggerBackgroundSync() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    try {
      await registration.sync.register('sync-outbox');
      return;
    } catch {
      // fall through
    }
  }
  registration.active?.postMessage({ type: 'SYNC_OUTBOX' });
}

export async function requestOutboxSync() {
  await triggerBackgroundSync();
}

export function useOfflineSync(merchant: string, context?: string) {
  const setQueueSize = useSyncStatus(state => state.setQueueSize);
  const startSync = useSyncStatus(state => state.startSync);
  const finishSync = useSyncStatus(state => state.finishSync);
  const recordQueued = useSyncStatus(state => state.recordQueued);
  const recordSynced = useSyncStatus(state => state.recordSynced);
  const recordConflict = useSyncStatus(state => state.recordConflict);
  const merchantRef = useRef(merchant);
  merchantRef.current = merchant;
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshQueueSize() {
      const size = await countOutbox();
      if (!cancelled) {
        setQueueSize(size);
      }
    }

    const runFlush = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      startSync('auto');
      try {
        await flush(
          item =>
            apiFetch(item.merchant, item.url, {
              method: item.method,
              headers: item.headers,
              body: item.body ?? undefined
            }),
          {
            onSuccess: item => {
              recordSynced(item);
            },
            onError: (item, error) => {
              const message = error instanceof ApiError ? error.message : 'Network error';
              recordConflict({ item, reason: message });
            }
          }
        );
      } finally {
        syncingRef.current = false;
        const size = await countOutbox();
        setQueueSize(size);
        finishSync(size === 0);
      }
    };

    refreshQueueSize();
    runFlush();

    const handleOnline = () => {
      if (!navigator.onLine) return;
      void runFlush();
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_OUTBOX') {
        void runFlush();
      }
    };

    window.addEventListener('online', handleOnline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [finishSync, recordConflict, recordSynced, setQueueSize, startSync]);

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const requestOptions: RequestInit = { ...options };
      try {
        const response = await apiFetch(merchantRef.current, url, requestOptions);
        return response;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        const id = crypto.randomUUID();
        const item = createOutboxItem({
          id,
          merchant: merchantRef.current,
          url,
          options: requestOptions,
          context
        });
        await enqueue(item);
        recordQueued(item);
        void triggerBackgroundSync();
        throw new OfflineQueuedError(id);
      }
    },
    [context, recordQueued]
  );

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
 main
}
