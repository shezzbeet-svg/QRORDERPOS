import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface SerializedRequest {
  id: string;
  merchant: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
  context?: string;
  queuedAt: number;
}

export interface CachedMenu {
  merchant: string;
  updatedAt: number;
  items: unknown[];
  categories?: unknown[];
}

export interface CachedOrders {
  merchant: string;
  waiterId?: string;
  updatedAt: number;
  orders: unknown[];
}

export interface CachedInventory {
  merchant: string;
  updatedAt: number;
  stock: unknown[];
  alerts: unknown[];
}

interface QrPosDbSchema extends DBSchema {
  outbox: {
    key: string;
    value: SerializedRequest;
  };
  menus: {
    key: string;
    value: CachedMenu;
  };
  orders: {
    key: string;
    value: CachedOrders;
  };
  inventory: {
    key: string;
    value: CachedInventory;
  };
  meta: {
    key: string;
    value: Record<string, unknown>;
  };
}

let dbPromise: Promise<IDBPDatabase<QrPosDbSchema>> | null = null;

export function getClientDb() {
  if (!dbPromise) {
    dbPromise = openDB<QrPosDbSchema>('qrpos', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('menus')) {
          db.createObjectStore('menus');
        }
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders');
        }
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      }
    });
  }
  return dbPromise;
}
