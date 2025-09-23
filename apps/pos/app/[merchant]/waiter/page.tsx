'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MenuItem } from '@qrorderpos/types';
import { apiFetch, ApiError } from '../../../src/lib/api';
import { useOfflineSync, OfflineQueuedError } from '../../../src/hooks/useOfflineSync';
import { getClientDb } from '../../../src/lib/db';
import { useAuth } from '../../../src/hooks/useAuth';
import { useSyncStatus } from '../../../src/hooks/useSyncStatus';

interface OrderLine {
  id: string;
  name: string;
  qty: number;
  priceEach: number;
}

interface OrderSummary {
  id: string;
  status: string;
  source: string;
  createdAt: string;
  subtotal: number;
  takenBy: { id: string; name: string; code: string } | null;
  items: OrderLine[];
  optimistic?: boolean;
}

type CartState = Record<string, number>;

export default function WaiterPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const submit = useOfflineSync(merchant, 'waiter-order');
  const authState = useAuth();
  const waiterId = authState.user?.id;
  const syncMeta = useSyncStatus(state => ({ lastSyncedAt: state.lastSyncedAt, queueSize: state.queueSize }));
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartState>({});
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [optimisticOrders, setOptimisticOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMenu() {
      const db = await getClientDb();
      try {
        const data = await apiFetch<MenuItem[]>(merchant, '/menu');
        if (!cancelled) {
          setMenu(data);
          await db.put('menus', { merchant, updatedAt: Date.now(), items: data }, `${merchant}-waiter-menu`);
        }
      } catch (err) {
        if (cancelled) return;
        const cached = await db.get('menus', `${merchant}-waiter-menu`);
        if (cached) {
          setMenu((cached.items as MenuItem[]) ?? []);
        } else {
          setError('Unable to load menu');
        }
      }
    }
    void loadMenu();
    return () => {
      cancelled = true;
    };
  }, [merchant]);

  const fetchOrders = useCallback(async () => {
    const db = await getClientDb();
    const key = `${merchant}:${waiterId ?? 'all'}`;
    try {
      const params = waiterId ? `?waiterId=${waiterId}&status=open` : '?status=open';
      const data = await apiFetch<OrderSummary[]>(merchant, `/orders${params}`);
      setOrders(data);
      setOptimisticOrders([]);
      await db.put('orders', { merchant, waiterId, updatedAt: Date.now(), orders: data }, key);
      setLoading(false);
    } catch (err) {
      const cached = await db.get('orders', key);
      if (cached) {
        setOrders((cached.orders as OrderSummary[]) ?? []);
        setLoading(false);
      } else {
        setError('Unable to load orders.');
      }
    }
  }, [merchant, waiterId]);

  useEffect(() => {
    void fetchOrders();
    const interval = setInterval(() => {
      void fetchOrders();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (syncMeta.lastSyncedAt) {
      void fetchOrders();
    }
  }, [syncMeta.lastSyncedAt, fetchOrders]);

  const total = useMemo(() => {
    return Object.entries(cart).reduce((sum, [menuId, qty]) => {
      const item = menu.find(entry => entry.id === menuId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [cart, menu]);

  const increment = (menuId: string) => {
    setCart(prev => ({ ...prev, [menuId]: (prev[menuId] ?? 0) + 1 }));
  };

  const decrement = (menuId: string) => {
    setCart(prev => {
      const current = prev[menuId];
      if (!current) return prev;
      const next = current - 1;
      if (next <= 0) {
        const { [menuId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const placeOrder = async () => {
    if (!Object.keys(cart).length) {
      setError('Add items before sending the order.');
      return;
    }
    setPlacing(true);
    setError(null);
    const itemsPayload = Object.entries(cart).map(([menuItemId, qty]) => ({ menuItemId, qty }));
    try {
      const response = await submit('/orders', {
        method: 'POST',
        body: JSON.stringify({ items: itemsPayload, source: 'waiter' })
      });
      if (response) {
        const created = response as OrderSummary;
        setOrders(prev => [created, ...prev]);
      }
      setCart({});
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        const optimisticOrder: OrderSummary = {
          id: err.requestId,
          status: 'queued',
          source: 'waiter',
          createdAt: new Date().toISOString(),
          subtotal: total,
          takenBy: authState.user
            ? { id: authState.user.id, name: authState.user.name, code: authState.user.code }
            : null,
          items: itemsPayload.map(entry => {
            const item = menu.find(menuItem => menuItem.id === entry.menuItemId);
            return {
              id: `${entry.menuItemId}-${err.requestId}`,
              name: item?.name ?? 'Menu item',
              qty: entry.qty,
              priceEach: item?.price ?? 0
            };
          }),
          optimistic: true
        };
        setOptimisticOrders(prev => [optimisticOrder, ...prev]);
        setCart({});
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create order.');
      }
    } finally {
      setPlacing(false);
    }
  };

  const outstandingOrders = [...optimisticOrders, ...orders];

  return (
    <div className="grid xl:grid-cols-3 gap-6">
      <section className="xl:col-span-2 bg-white rounded-lg shadow-sm p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Waiter console</h1>
          <p className="text-sm text-slate-500">
            Logged in as {authState.user?.name ?? '—'} ({authState.user?.code})
          </p>
        </header>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menu.map(item => (
            <button
              key={item.id}
              className="border rounded-lg p-4 text-left hover:border-slate-500 transition"
              onClick={() => increment(item.id)}
            >
              <div className="font-semibold text-lg">{item.name}</div>
              <div className="text-sm text-slate-500">{item.price}</div>
              {cart[item.id] ? (
                <div className="mt-3 text-sm text-emerald-600 font-medium">
                  Qty: {cart[item.id]}
                </div>
              ) : null}
            </button>
          ))}
        </div>
        <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current ticket</h2>
            <span className="text-sm text-slate-500">Total: {total.toFixed(0)}</span>
          </div>
          {Object.keys(cart).length === 0 && <p className="text-sm text-slate-500">Tap items to build a ticket.</p>}
          <ul className="space-y-2">
            {Object.entries(cart).map(([menuItemId, qty]) => {
              const item = menu.find(entry => entry.id === menuItemId);
              return (
                <li key={menuItemId} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{item?.name ?? menuItemId}</div>
                    <div className="text-xs text-slate-500">{item?.price ?? 0}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => decrement(menuItemId)}>
                      −
                    </button>
                    <span className="w-6 text-center">{qty}</span>
                    <button className="px-2 py-1 border rounded" onClick={() => increment(menuItemId)}>
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="text-right">
            <button
              className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={placeOrder}
              disabled={placing || Object.keys(cart).length === 0}
            >
              {placing ? 'Sending…' : 'Send to kitchen'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live orders</h2>
          <span className="text-xs text-slate-500">{syncMeta.queueSize} queued</span>
        </div>
        {loading && <div className="text-sm text-slate-500">Loading orders…</div>}
        <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {outstandingOrders.map(order => (
            <li key={order.id} className="border rounded-lg p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    #{order.id.slice(0, 6)} · {new Date(order.createdAt).toLocaleTimeString()}
                  </div>
                  <div className="font-semibold uppercase tracking-wide text-xs">
                    {order.optimistic ? 'Queued (offline)' : order.status}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {order.takenBy ? order.takenBy.name : 'Unassigned'}
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {order.items.map(line => (
                  <li key={line.id} className="flex justify-between">
                    <span>
                      {line.qty} × {line.name}
                    </span>
                    <span>{(line.priceEach * line.qty).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-right text-sm font-semibold">{order.subtotal.toFixed(0)}</div>
            </li>
          ))}
          {!loading && outstandingOrders.length === 0 && (
            <li className="text-sm text-slate-500">No open orders.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
