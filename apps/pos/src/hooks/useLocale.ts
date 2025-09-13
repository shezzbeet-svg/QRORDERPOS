'use client';
import { create } from 'zustand';
import type { Locale } from '../lib/i18n';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocale = create<LocaleState>(set => ({
  locale: 'en',
  setLocale: locale => set({ locale })
}));
