'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { requestOutboxSync } from '../hooks/useOfflineSync';

function formatRelative(timestamp: number | null) {
  if (!timestamp) return '—';
  const delta = Date.now() - timestamp;
  if (delta < 5_000) return 'just now';
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  return `${Math.round(delta / 3_600_000)}h ago`;
}

export function SyncStatusBar() {
  const { queueSize, syncing, lastSyncedAt, conflicts, pendingSince, clearConflict } = useSyncStatus(state => ({
    queueSize: state.queueSize,
    syncing: state.syncing,
    lastSyncedAt: state.lastSyncedAt,
    conflicts: state.conflicts,
    pendingSince: state.pendingSince,
    clearConflict: state.clearConflict
  }));
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const statusMessage = useMemo(() => {
    if (offline) {
      return 'Offline mode — queued changes will sync automatically.';
    }
    if (queueSize > 0 && !syncing) {
      return `Pending ${queueSize} change${queueSize > 1 ? 's' : ''} since ${formatRelative(pendingSince)}.`;
    }
    if (syncing) {
      return 'Synchronising changes…';
    }
    return `Last synced ${formatRelative(lastSyncedAt)}.`;
  }, [offline, queueSize, syncing, lastSyncedAt, pendingSince]);

  if (!offline && queueSize === 0 && conflicts.length === 0 && !syncing && lastSyncedAt) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-slate-100 text-sm px-4 py-2 flex flex-col gap-2 shadow">
      <div className="flex items-center justify-between gap-3">
        <span>{statusMessage}</span>
        {(queueSize > 0 || syncing) && (
          <button
            type="button"
            className="text-xs underline decoration-dotted"
            onClick={() => requestOutboxSync()}
          >
            Retry sync
          </button>
        )}
      </div>
      {conflicts.length > 0 && (
        <div className="rounded bg-red-500/10 border border-red-500/40 px-3 py-2">
          <div className="font-semibold text-red-200 mb-1">Conflicts detected</div>
          <ul className="space-y-1 text-xs text-red-100">
            {conflicts.map(conflict => (
              <li key={conflict.id} className="flex items-start justify-between gap-3">
                <span>
                  {conflict.item.context || conflict.item.url} — {conflict.reason}
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => clearConflict(conflict.id)}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
