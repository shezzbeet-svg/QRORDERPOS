'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { OfflineIndicator } from './OfflineIndicator';
import { useLocale } from '../hooks/useLocale';
import { t } from '../lib/i18n';

export function Layout({ merchant, children }: { merchant: string; children: ReactNode }) {
  const { role, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const links = [
    { href: `/${merchant}/menu`, label: t(locale, 'menu'), roles: ['waiter', 'admin', 'cashier'] },
    { href: `/${merchant}/waiter`, label: t(locale, 'order'), roles: ['waiter'] },
    { href: `/${merchant}/admin`, label: 'Admin', roles: ['admin', 'cashier'] }
  ];
  return (
    <div className="min-h-screen flex">
      <OfflineIndicator />
      <aside className="w-48 bg-gray-800 text-white p-4 space-y-4">
        <h2 className="text-lg font-bold">QRPOS</h2>
        <nav className="space-y-2">
          {links
            .filter(l => !role || l.roles.includes(role))
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
            \u0627\u0631\u062f\u0648
          </button>
        </div>
        {role && (
          <button onClick={logout} className="mt-4 text-sm underline">
            {t(locale, 'logout')}
          </button>
        )}
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
