'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useOfflineSync, OfflineQueuedError } from '../../../../src/hooks/useOfflineSync';
import { apiFetch, ApiError } from '../../../../src/lib/api';
import { getClientDb } from '../../../../src/lib/db';

interface StockItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  parLevel: number | null;
  isLow?: boolean;
}

interface StockCountDraft {
  [itemId: string]: number;
}

export default function StockPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const { user } = useAuth();
  const submit = useOfflineSync(merchant, 'inventory');
  const [items, setItems] = useState<StockItem[]>([]);
  const [lowStock, setLowStock] = useState<StockItem[]>([]);
  const [draft, setDraft] = useState<StockCountDraft>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'cashier')) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const db = await getClientDb();
      try {
        const [stock, alerts] = await Promise.all([
          apiFetch<StockItem[]>(merchant, '/inventory/items/stock'),
          apiFetch<StockItem[]>(merchant, '/inventory/alerts/low-stock')
        ]);
        if (cancelled) return;
        setItems(stock);
        setLowStock(alerts);
        await db.put('inventory', { merchant, updatedAt: Date.now(), stock, alerts }, merchant);
      } catch (err) {
        if (cancelled) return;
        const cached = await db.get('inventory', merchant);
        if (cached) {
          setItems((cached.stock as StockItem[]) ?? []);
          setLowStock((cached.alerts as StockItem[]) ?? []);
          setMessage('Loaded cached inventory data. Changes will sync when online.');
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load inventory.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [merchant, user]);

  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) {
    return <div className="text-sm text-slate-500">Access denied</div>;
  }

  const adjustStock = async (item: StockItem, delta: number) => {
    setMessage(null);
    setError(null);
    setItems(prev => prev.map(it => (it.id === item.id ? { ...it, stock: it.stock + delta } : it)));
    try {
      await submit('/inventory/stock-adjustments', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, delta, reason: delta > 0 ? 'Manual increment' : 'Manual decrement' })
      });
      setMessage('Adjustment submitted.');
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        setMessage('Adjustment queued for sync.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit adjustment.');
      }
    }
  };

  const setDraftCount = (itemId: string, value: number) => {
    setDraft(prev => ({ ...prev, [itemId]: value }));
  };

  const submitCount = async () => {
    const entries = Object.entries(draft).map(([itemId, counted]) => ({ itemId, counted }));
    if (!entries.length) {
      setError('Enter at least one count value.');
      return;
    }
    setMessage(null);
    setError(null);
    try {
      await submit('/inventory/stock-counts', {
        method: 'POST',
        body: JSON.stringify({ entries })
      });
      setDraft({});
      setMessage('Stock count recorded.');
      const refreshed = await apiFetch<StockItem[]>(merchant, '/inventory/items/stock');
      setItems(refreshed);
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        setDraft({});
        setMessage('Stock count queued for sync.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to submit stock count.');
      }
    }
  };

  const totalVariance = useMemo(() => {
    return Object.entries(draft).reduce((sum, [itemId, counted]) => {
      const item = items.find(entry => entry.id === itemId);
      if (!item) return sum;
      return sum + (counted - item.stock);
    }, 0);
  }, [draft, items]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Inventory control</h1>
        <p className="text-sm text-slate-500">Manage stock levels, manual adjustments and nightly counts.</p>
      </header>
      {loading && <div className="text-sm text-slate-500">Loading inventory…</div>}
      {message && <div className="text-sm text-emerald-600">{message}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">On-hand stock</h2>
          <span className="text-xs text-slate-500">{items.length} items</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Par</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className={item.isLow ? 'bg-red-50/50' : ''}>
                  <td className="py-2">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.id}</div>
                  </td>
                  <td className="py-2 font-semibold">{item.stock.toFixed(2)} {item.unit}</td>
                  <td className="py-2 text-xs text-slate-500">{item.parLevel ?? '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
                        onClick={() => adjustStock(item, 1)}
                      >
                        +1
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                        onClick={() => adjustStock(item, -1)}
                      >
                        -1
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Stock count</h2>
          <span className="text-xs text-slate-500">Variance: {totalVariance.toFixed(2)}</span>
        </header>
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(item => (
            <label key={item.id} className="border rounded-lg p-3 flex flex-col gap-2">
              <span className="text-sm font-medium">{item.name}</span>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1 text-sm"
                placeholder={item.stock.toFixed(2)}
                value={draft[item.id] ?? ''}
                onChange={event => setDraftCount(item.id, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
        <div className="text-right">
          <button className="bg-slate-900 text-white px-4 py-2 rounded" onClick={submitCount}>
            Submit count
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-lg">Low stock alerts</h2>
        <ul className="space-y-2 text-sm">
          {lowStock.map(item => (
            <li key={item.id} className="border rounded p-3 flex items-center justify-between">
              <span>{item.name}</span>
              <span className="text-red-600 font-semibold">{item.stock.toFixed(1)} {item.unit}</span>
            </li>
          ))}
          {lowStock.length === 0 && <li className="text-slate-500">All items above par.</li>}
        </ul>
      </section>
    </div>
  );
}
