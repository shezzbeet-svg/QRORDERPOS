'use client';
import { useEffect, useState } from 'react';
import type { MenuItem } from '@qrorderpos/types';
import { apiFetch } from '../../../../src/lib/api';
import { useOfflineSync } from '../../../../src/hooks/useOfflineSync';
import { useAuth } from '../../../../src/hooks/useAuth';

interface StockItem {
  id: string;
  name: string;
  stock: number;
}

export default function StockPage({ params }: { params: { merchant: string } }) {
  const { role } = useAuth();
  if (role !== 'admin' && role !== 'cashier') return <div>Access denied</div>;
  const { merchant } = params;
  const [items, setItems] = useState<StockItem[]>([]);
  const submit = useOfflineSync(merchant);

  useEffect(() => {
    apiFetch<StockItem[]>(merchant, '/items/stock').then(setItems);
  }, [merchant]);

  const adjust = async (id: string, delta: number) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, stock: it.stock + delta } : it)));
    await submit('/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify({ itemId: id, delta })
    });
  };

  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.id} className="flex justify-between items-center border p-2 rounded">
          <div>
            <div className="font-bold">{it.name}</div>
            <div className="text-sm">Stock: {it.stock}</div>
          </div>
          <div className="space-x-2">
            <button onClick={() => adjust(it.id, 1)} className="px-2 py-1 bg-green-600 text-white rounded">+1</button>
            <button onClick={() => adjust(it.id, -1)} className="px-2 py-1 bg-red-600 text-white rounded">-1</button>
          </div>
        </div>
      ))}
    </div>
  );
}
