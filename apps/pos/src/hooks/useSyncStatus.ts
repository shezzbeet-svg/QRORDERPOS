'use client';
import { create } from 'zustand';
import type { OutboxItem } from '../lib/offlineQueue';

export interface SyncConflict {
  id: string;
  item: OutboxItem;
  reason: string;
  lastTriedAt: number;
}

interface SyncState {
  queueSize: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  pendingSince: number | null;
  conflicts: SyncConflict[];
  setQueueSize: (size: number) => void;
  startSync: (trigger: string) => void;
  finishSync: (hadChanges: boolean) => void;
  recordQueued: (item: OutboxItem) => void;
  recordSynced: (item: OutboxItem) => void;
  recordConflict: (conflict: { item: OutboxItem; reason: string }) => void;
  clearConflict: (id: string) => void;
}

export const useSyncStatus = create<SyncState>((set, get) => ({
  queueSize: 0,
  syncing: false,
  lastSyncedAt: null,
  pendingSince: null,
  conflicts: [],
  setQueueSize: size => set({ queueSize: size }),
  startSync: () => {
    if (!get().syncing) {
      set({ syncing: true, pendingSince: get().pendingSince ?? Date.now() });
    }
  },
  finishSync: hadChanges => {
    if (!get().syncing) return;
    set({
      syncing: false,
      lastSyncedAt: hadChanges ? Date.now() : get().lastSyncedAt,
      pendingSince: get().queueSize > 0 ? get().pendingSince : null
    });
  },
  recordQueued: item => {
    set(state => ({
      queueSize: state.queueSize + 1,
      pendingSince: state.pendingSince ?? Date.now(),
      conflicts: state.conflicts.filter(conflict => conflict.id !== item.id)
    }));
  },
  recordSynced: item => {
    set(state => ({
      queueSize: Math.max(0, state.queueSize - 1),
      lastSyncedAt: Date.now(),
      conflicts: state.conflicts.filter(conflict => conflict.id !== item.id),
      pendingSince: state.queueSize > 1 ? state.pendingSince : null
    }));
  },
  recordConflict: ({ item, reason }) => {
    const conflict: SyncConflict = {
      id: item.id,
      item,
      reason,
      lastTriedAt: Date.now()
    };
    set(state => ({
      conflicts: [...state.conflicts.filter(existing => existing.id !== conflict.id), conflict]
    }));
  },
  clearConflict: id => {
    set(state => ({ conflicts: state.conflicts.filter(conflict => conflict.id !== id) }));
  }
}));
