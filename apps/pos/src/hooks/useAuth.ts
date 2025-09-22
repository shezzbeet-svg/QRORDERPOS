'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

export type UserRole = 'admin' | 'cashier' | 'waiter';

export interface AuthUser {
  id: string;
  name: string;
  code: string;
  role: UserRole;
}

export interface MerchantMeta {
  id: string;
  slug: string;
  name: string;
  currency: string;
  locale: string;
  timezone: string;
  serviceFee?: number;
  tipOptions?: number[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  merchant: MerchantMeta | null;
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser; merchant: MerchantMeta }) => void;
  updateSession: (session: Partial<{ accessToken: string; refreshToken: string; user: AuthUser; merchant: MerchantMeta }>) => void;
  logout: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

export const useAuth = create<AuthState>()(
  persist(
    set => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      merchant: null,
      setSession: session => set({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
        merchant: session.merchant
      }),
      updateSession: session =>
        set(state => ({
          accessToken: session.accessToken ?? state.accessToken,
          refreshToken: session.refreshToken ?? state.refreshToken,
          user: session.user ?? state.user,
          merchant: session.merchant ?? state.merchant
        })),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, merchant: null })
    }),
    {
      name: 'qrpos-auth',
      storage: createJSONStorage<AuthState>(() => (typeof window === 'undefined' ? noopStorage : window.localStorage))
    }
  )
);
