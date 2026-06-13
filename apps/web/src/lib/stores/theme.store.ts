/**
 * src/lib/stores/theme.store.ts — Theme store (per Agent Guide §1.1.2).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  themePreference: string;
  darkMode: boolean;
  setThemePreference: (t: string) => void;
  setDarkMode: (d: boolean) => void;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themePreference: 'default',
      darkMode: false,
      setThemePreference: (themePreference) => set({ themePreference }),
      setDarkMode: (darkMode) => {
        set({ darkMode });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', darkMode);
        }
      },
      toggleDarkMode: () => {
        set((s) => {
          const next = !s.darkMode;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next);
          }
          return { darkMode: next };
        });
      },
    }),
    { name: 'unify-theme' },
  ),
);
