/**
 * src/lib/stores/auth.store.ts — Zustand auth store.
 * Persists tokens in localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '@unify/shared-types';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  themePreference: string;
  darkMode: boolean;
  departmentId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'unify-auth' },
  ),
);
