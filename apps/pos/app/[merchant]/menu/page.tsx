'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../src/lib/api';
import { openDB } from 'idb';
import type { MenuItem } from '@qrorderpos/types';

export default function MenuPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const [menu, setMenu] = useState<MenuItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const db = await openDB('qrpos', 1, {
        upgrade(db) {
          db.createObjectStore('menu');
        }
      });
      try {
        const data = await apiFetch<MenuItem[]>(merchant, '/menu');
        setMenu(data);
        const tx = db.transaction('menu', 'readwrite');
        await tx.store.put(data, merchant);
        await tx.done;
      } catch {
        const cached = await db.get('menu', merchant);
        if (cached) setMenu(cached as MenuItem[]);
      }
    };
    load();
  }, [merchant]);

  return (
    <div className="space-y-2">
      {menu.map(item => (
        <div key={item.id} className="border p-2 rounded">
          <div className="font-bold">{item.name}</div>
          <div>{item.price}</div>
        </div>
      ))}
    </div>
  );
}
