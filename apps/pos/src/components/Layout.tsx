'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import { t } from '../lib/i18n';
import { logoutSession } from '../lib/authClient';
import { SyncStatusBar } from './SyncStatusBar';

export function Layout({ merchant, children }: { merchant: string; children: ReactNode }) {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { user, merchant: currentMerchant, logout, refreshToken } = useAuth(state => ({
    user: state.user,
    merchant: state.merchant,
    logout: state.logout,
    refreshToken: state.refreshToken
  }));
  const role = user?.role;
  const links = [
    { href: `/${merchant}/menu`, label: t(locale, 'menu'), roles: ['waiter', 'admin', 'cashier'] },
    { href: `/${merchant}/waiter`, label: t(locale, 'waiterConsole'), roles: ['waiter', 'admin', 'cashier'] },
    { href: `/${merchant}/admin`, label: t(locale, 'dashboard'), roles: ['admin', 'cashier'] },
    { href: `/${merchant}/admin/stock`, label: t(locale, 'inventory'), roles: ['admin', 'cashier'] },
    { href: `/${merchant}/admin/devices`, label: t(locale, 'devices'), roles: ['admin'] }
  ];

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutSession(refreshToken);
      }
    } catch (err) {
      console.warn('Failed to notify server about logout', err);
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-slate-100 p-4 space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">QRPOS</h2>
          <p className="text-xs text-slate-300">
            {currentMerchant?.name ?? merchant}
          </p>
        </div>
        <nav className="space-y-2 text-sm">
          {links
            .filter(link => !role || link.roles.includes(role))
            .map(link => (
              <Link key={link.href} href={link.href} className="block hover:underline">
                {link.label}
              </Link>
            ))}
        </nav>
        <div className="space-x-2 text-xs uppercase tracking-wide">
          <button onClick={() => setLocale('en')} className={`px-2 py-1 rounded ${locale === 'en' ? 'bg-slate-100 text-slate-900' : ''}`}>
            EN
          </button>
          <button onClick={() => setLocale('ur')} className={`px-2 py-1 rounded ${locale === 'ur' ? 'bg-slate-100 text-slate-900' : ''}`}>
            اردو
          </button>
        </div>
        {user && (
          <div className="text-sm space-y-1 border-t border-slate-800 pt-4">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">{user.code}</div>
            <button onClick={handleLogout} className="mt-2 underline text-xs">
              {t(locale, 'logout')}
            </button>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <SyncStatusBar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
