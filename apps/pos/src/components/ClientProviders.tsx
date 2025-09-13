'use client';
import { useEffect } from 'react';
import { useLocale } from '../hooks/useLocale';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
  }, [locale]);
  return children as any;
}
