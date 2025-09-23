'use client';
 codex/build-modular-frontend-for-restaurant-pos-yluvnu
import { useEffect, useState } from 'react';
import { useAuth } from '../../../src/hooks/useAuth';
import { apiFetch, ApiError } from '../../../src/lib/api';
import { getClientDb } from '../../../src/lib/db';
import { useSyncStatus } from '../../../src/hooks/useSyncStatus';

interface DashboardSummary {
  openOrders: number;
  payments: { count: number; amount: number; tips: number };
  lowStock: Array<{ id: string; name: string; unit: string; stock: number; parLevel: number | null }>;
}

interface OrderSummary {
  id: string;
  status: string;
  subtotal: number;
  createdAt: string;
  takenBy: { name: string } | null;
}

export default function AdminHome({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const { user } = useAuth();
  const syncMeta = useSyncStatus(state => ({ lastSyncedAt: state.lastSyncedAt }));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [openOrders, setOpenOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'cashier')) return;
    let cancelled = false;
    async function load() {
      const db = await getClientDb();
      try {
        const [dashboard, orders] = await Promise.all([
          apiFetch<DashboardSummary>(merchant, '/dashboard/summary'),
          apiFetch<OrderSummary[]>(merchant, '/orders?status=open')
        ]);
        if (cancelled) return;
        setSummary(dashboard);
        setOpenOrders(orders);
        await db.put('meta', { summary: dashboard }, `${merchant}-summary`);
        await db.put('orders', { merchant, waiterId: undefined, updatedAt: Date.now(), orders }, `${merchant}-admin-open`);
      } catch (err) {
        const db = await getClientDb();
        const cachedSummary = await db.get('meta', `${merchant}-summary`);
        const cachedOrders = await db.get('orders', `${merchant}-admin-open`);
        if (cachedSummary) setSummary(cachedSummary.summary as DashboardSummary);
        if (cachedOrders) setOpenOrders((cachedOrders.orders as OrderSummary[]) ?? []);
        if (!cachedSummary && !cachedOrders) {
          setError(err instanceof ApiError ? err.message : 'Unable to load dashboard data.');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [merchant, user]);

  useEffect(() => {
    if (syncMeta.lastSyncedAt) {
      if (user && (user.role === 'admin' || user.role === 'cashier')) {
        void (async () => {
          try {
            const orders = await apiFetch<OrderSummary[]>(merchant, '/orders?status=open');
            setOpenOrders(orders);
          } catch {
            // ignore refresh failure
          }
        })();
      }
    }
  }, [syncMeta.lastSyncedAt, merchant, user]);

  if (!user || (user.role !== 'admin' && user.role !== 'cashier')) {
    return <div className="text-sm text-slate-500">Access denied</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-slate-500">Open tickets</div>
          <div className="text-3xl font-semibold">{summary?.openOrders ?? '—'}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-slate-500">Daily revenue</div>
          <div className="text-3xl font-semibold">{summary ? summary.payments.amount.toFixed(0) : '—'}</div>
          <div className="text-xs text-slate-500">{summary ? `${summary.payments.count} payments` : '—'}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-slate-500">Tips captured</div>
          <div className="text-3xl font-semibold">{summary ? summary.payments.tips.toFixed(0) : '—'}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-lg shadow-sm p-4">
          <header className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Open tickets</h2>
          </header>
          <ul className="space-y-2">
            {openOrders.map(order => (
              <li key={order.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">#{order.id.slice(0, 6)}</div>
                  <div className="text-xs text-slate-500">
                    {order.takenBy?.name ?? '—'} · {new Date(order.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm font-semibold">{order.subtotal.toFixed(0)}</div>
              </li>
            ))}
            {openOrders.length === 0 && <li className="text-sm text-slate-500">No open tickets 🎉</li>}
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4">
          <header className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Low stock alerts</h2>
          </header>
          <ul className="space-y-2">
            {summary?.lowStock?.map(item => (
              <li key={item.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500">Par {item.parLevel ?? '—'} {item.unit}</div>
                </div>
                <div className="text-sm font-semibold text-red-600">{item.stock.toFixed(1)}</div>
              </li>
            ))}
            {summary && summary.lowStock.length === 0 && (
              <li className="text-sm text-slate-500">Inventory is healthy.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );

import { useAuth } from '../../../src/hooks/useAuth';

export default function AdminHome({ params }: { params: { merchant: string } }) {
  const { role } = useAuth();
  if (role !== 'admin' && role !== 'cashier') {
    return <div>Access denied</div>;
  }
  return <div>Admin Dashboard for {params.merchant}</div>;
 main
}
