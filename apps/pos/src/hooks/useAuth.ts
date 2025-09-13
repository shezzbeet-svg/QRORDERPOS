'use client';
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: 'admin' | 'cashier' | 'waiter' | null;
  login: (token: string, role: AuthState['role']) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>(set => ({
  token: null,
  role: null,
  login: (token, role) => set({ token, role }),
  logout: () => set({ token: null, role: null })
}));
