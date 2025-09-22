'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { OfflineIndicator } from './OfflineIndicator';
import { useLocale } from '../hooks/useLocale';
import { t } from '../lib/i18n';
import { logoutSession } from '../lib/authClient';

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
    { href: `/${merchant}/waiter`, label: t(locale, 'order'), roles: ['waiter'] },
    { href: `/${merchant}/admin`, label: 'Admin', roles: ['admin', 'cashier'] }
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
    <div className="min-h-screen flex bg-slate-50">
      <OfflineIndicator />
      <aside className="w-60 bg-gray-900 text-white p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">QRPOS</h2>
          <p className="text-xs text-gray-300">
            {currentMerchant?.name ?? merchant}
          </p>
        </div>
        <nav className="space-y-2">
          {links
            .filter(link => !role || link.roles.includes(role))
            .map(link => (
              <Link key={link.href} href={link.href} className="block hover:underline">
                {link.label}
              </Link>
            ))}
        </nav>
        <div className="space-x-2 text-sm">
          <button onClick={() => setLocale('en')} className={locale === 'en' ? 'underline' : ''}>
            EN
          </button>
          <button onClick={() => setLocale('ur')} className={locale === 'ur' ? 'underline' : ''}>
            اردو
          </button>
        </div>
        {user && (
          <div className="text-sm space-y-1">
            <div>{user.name}</div>
            <div className="text-xs text-gray-300">{user.code}</div>
            <button onClick={handleLogout} className="mt-2 underline">
              {t(locale, 'logout')}
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
