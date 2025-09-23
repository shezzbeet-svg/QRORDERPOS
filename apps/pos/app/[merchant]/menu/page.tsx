'use client';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError, clientUuid } from '../../../src/lib/api';
import { getClientDb } from '../../../src/lib/db';
import { useOfflineSync, OfflineQueuedError } from '../../../src/hooks/useOfflineSync';
import { useLocale } from '../../../src/hooks/useLocale';
import { t } from '../../../src/lib/i18n';
import { QrBadge } from '../../../src/components/QrBadge';
import { useAuth } from '../../../src/hooks/useAuth';

interface CategoryItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  tags?: string[];
  allergens?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  items: CategoryItem[];
}

type CartState = Record<string, { item: CategoryItem; qty: number }>;

const WALLET_ACCOUNTS = [
  { provider: 'Easypaisa', account: '0300-1234567' },
  { provider: 'JazzCash', account: '0301-7654321' }
];

export default function MenuPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const submit = useOfflineSync(merchant, 'customer-order');
  const { locale } = useLocale();
  const merchantMeta = useAuth(state => state.merchant);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      setLoading(true);
      setError(null);
      const db = await getClientDb();
      try {
        const data = await apiFetch<MenuCategory[]>(merchant, '/menu/categories');
        if (!active) return;
        setCategories(data);
        setSelectedCategory(data[0]?.id ?? null);
        await db.put('menus', { merchant, updatedAt: Date.now(), items: data }, merchant);
      } catch (err) {
        if (!active) return;
        const cached = await db.get('menus', merchant);
        if (cached) {
          const cachedItems = cached.items as MenuCategory[];
          setCategories(cachedItems);
          setSelectedCategory(cachedItems[0]?.id ?? null);
          setStatus(t(locale, 'syncQueued'));
        } else {
          setError('Unable to load menu. Check your connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMenu();
    return () => {
      active = false;
    };
  }, [merchant, locale]);

  const total = useMemo(() => {
    return Object.values(cart).reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
  }, [cart]);

  const addToCart = (item: CategoryItem) => {
    setCart(prev => {
      const current = prev[item.id];
      const qty = current ? current.qty + 1 : 1;
      return { ...prev, [item.id]: { item, qty } };
    });
  };

  const adjustQty = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      const qty = current.qty + delta;
      if (qty <= 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...current, qty } };
    });
  };

  const placeOrder = async () => {
    if (!Object.keys(cart).length) {
      setError('Add at least one item.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setStatus(null);
    const payload = {
      items: Object.values(cart).map(entry => ({ menuItemId: entry.item.id, qty: entry.qty })),
      source: 'customer'
    };
    try {
      await submit('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setCart({});
      setStatus('Order sent to the kitchen.');
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        setCart({});
        setStatus(t(locale, 'syncQueued'));
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to submit order.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selected = categories.find(cat => cat.id === selectedCategory) ?? categories[0];
  const currency = merchantMeta?.currency ?? 'PKR';
  const serviceFee = merchantMeta?.serviceFee ?? 0;
  const tipOptions = merchantMeta?.tipOptions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6 items-center justify-between bg-white p-4 rounded shadow">
        <div>
          <h1 className="text-2xl font-semibold">{merchantMeta?.name ?? merchant}</h1>
          <p className="text-sm text-slate-500">Client ID: {clientUuid}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500">
            <div className="font-medium text-slate-700 mb-1">Wallets</div>
            <ul className="space-y-1">
              {WALLET_ACCOUNTS.map(wallet => (
                <li key={wallet.provider}>
                  <span className="font-semibold text-slate-700">{wallet.provider}:</span> {wallet.account}
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <div>
                {t(locale, 'serviceFee')}: {(serviceFee * 100).toFixed(1)}%
              </div>
              {tipOptions.length > 0 && (
                <div>
                  {t(locale, 'tip')}: {tipOptions.map(opt => `${opt}%`).join(', ')}
                </div>
              )}
            </div>
          </div>
          <QrBadge value={`${merchant}:${clientUuid}`} />
        </div>
      </div>

      {loading && <div className="text-center text-slate-500">Loading menu…</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {status && <div className="text-emerald-600 text-sm">{status}</div>}

      {!loading && categories.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap ${
                    category.id === selected?.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-300 text-slate-600'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {(selected?.items ?? []).map(item => (
                <article key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{item.name}</h2>
                      <p className="text-sm text-slate-500">{currency} {item.price.toFixed(0)}</p>
                    </div>
                    <button
                      className="bg-slate-900 text-white text-xs px-3 py-1 rounded-full"
                      onClick={() => addToCart(item)}
                    >
                      {t(locale, 'addToCart')}
                    </button>
                  </div>
                  {item.description && <p className="text-sm text-slate-600 mt-2">{item.description}</p>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-500">
                      {item.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </aside>

          <section className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">{t(locale, 'items')}</h2>
              {Object.values(cart).length === 0 && (
                <p className="text-sm text-slate-500">Add items to build a ticket.</p>
              )}
              <ul className="divide-y divide-slate-200">
                {Object.values(cart).map(entry => (
                  <li key={entry.item.id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{entry.item.name}</div>
                      <div className="text-xs text-slate-500">{currency} {entry.item.price.toFixed(0)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center"
                        onClick={() => adjustQty(entry.item.id, -1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{entry.qty}</span>
                      <button
                        className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center"
                        onClick={() => adjustQty(entry.item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span>{t(locale, 'total')}</span>
                <span className="font-semibold text-lg">{currency} {total.toFixed(0)}</span>
              </div>
            </div>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded disabled:opacity-50"
              onClick={placeOrder}
              disabled={submitting || Object.keys(cart).length === 0}
            >
              {submitting ? 'Sending…' : t(locale, 'submitOrder')}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
