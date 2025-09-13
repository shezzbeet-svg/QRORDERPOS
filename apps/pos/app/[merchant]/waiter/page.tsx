'use client';
import { useEffect, useState } from 'react';
import type { MenuItem } from '@qrorderpos/types';
import { apiFetch } from '../../../src/lib/api';
import { useOfflineSync } from '../../../src/hooks/useOfflineSync';

export default function WaiterPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [items, setItems] = useState<Record<string, number>>({});
  const submit = useOfflineSync(merchant);

  useEffect(() => {
    apiFetch<MenuItem[]>(merchant, '/menu').then(setMenu);
  }, [merchant]);

  const placeOrder = async () => {
    const orderItems = Object.entries(items).map(([id, qty]) => ({ id, qty }));
    await submit('/orders', {
      method: 'POST',
      body: JSON.stringify({ items: orderItems })
    });
    setItems({});
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {menu.map(item => (
          <button
            key={item.id}
            onClick={() => setItems(s => ({ ...s, [item.id]: (s[item.id] || 0) + 1 }))}
            className="border p-2 rounded"
          >
            {item.name}
          </button>
        ))}
      </div>
      <div>
        <h3 className="font-bold mb-2">Current Order</h3>
        {Object.entries(items).map(([id, qty]) => {
          const item = menu.find(m => m.id === id);
          return (
            <div key={id} className="flex justify-between">
              <span>{item?.name}</span>
              <span>{qty}</span>
            </div>
          );
        })}
      </div>
      <button onClick={placeOrder} className="bg-green-600 text-white px-4 py-2 rounded">
        Send Order
      </button>
    </div>
  );
}
