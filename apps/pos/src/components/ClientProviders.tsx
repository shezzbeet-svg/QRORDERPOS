'use client';
import { useEffect } from 'react';
import { useLocale } from '../hooks/useLocale';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
 codex/build-modular-frontend-for-restaurant-pos-yluvnu

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('Service worker registration failed', error);
      });
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dir = locale === 'ur' ? 'rtl' : 'ltr';
    root.lang = locale;
  }, [locale]);


  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
  }, [locale]);
 main
  return children as any;
}
