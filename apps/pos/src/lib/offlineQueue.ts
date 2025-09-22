import { openDB } from 'idb';

type OutboxItem = {
  id: string;
  merchant: string;
  url: string;
  options: RequestInit;
};

const DB_NAME = 'qrpos';
const STORE_NAME = 'outbox';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  });
}

export async function enqueue(item: OutboxItem) {
  const db = await getDb();
  await db.put(STORE_NAME, item);
}

export async function flush(send: (item: OutboxItem) => Promise<void>) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  for await (const cursor of store) {
    const item = cursor.value as OutboxItem;
    try {
      await send(item);
      await cursor.delete();
    } catch (err) {
      console.error('Flush failed', err);
    }
  }
  await tx.done;
}
