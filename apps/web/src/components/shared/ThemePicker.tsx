'use client';

import { useThemeStore } from '@/lib/stores/theme.store';
import { Check, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const THEMES = [
  { id: 'default', name: 'پیش‌فرض', primary: '#6366f1', accent: '#3b82f6' },
  { id: 'ocean', name: 'اقیانوس', primary: '#0891b2', accent: '#06b6d4' },
  { id: 'forest', name: 'جنگل', primary: '#16a34a', accent: '#22c55e' },
  { id: 'sunset', name: 'غروب', primary: '#f97316', accent: '#fb923c' },
  { id: 'royal', name: 'سلطنتی', primary: '#7c3aed', accent: '#a855f7' },
  { id: 'rose', name: 'رز', primary: '#e11d48', accent: '#f43f5e' },
] as const;

export function ThemePicker() {
  const { themePreference, setThemePreference, darkMode, setDarkMode } = useThemeStore();

  const applyTheme = (themeId: string) => {
    setThemePreference(themeId);
    if (typeof document !== 'undefined') {
      const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
      document.documentElement.style.setProperty('--theme-primary', theme.primary);
      document.documentElement.style.setProperty('--theme-accent', theme.accent);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          انتخاب تم رنگی
        </CardTitle>
        <CardDescription>
          تم مورد نظر خود را از بین گزینه‌های زیر انتخاب کنید. تغییرات بلافاصله اعمال می‌شوند.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {THEMES.map((theme) => {
            const active = themePreference === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={cn(
                  'p-4 rounded-lg border-2 text-right transition-all hover:scale-105',
                  active ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-border',
                )}
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}15 0%, ${theme.accent}15 100%)`,
                }}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{theme.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex gap-1">
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: theme.primary }} />
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: theme.accent }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between p-3 border rounded-md">
          <span className="font-medium">حالت تاریک</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-input peer-checked:bg-primary rounded-full transition-colors relative">
              <div
                className={cn(
                  'absolute top-0.5 h-5 w-5 bg-background rounded-full transition-all',
                  darkMode ? 'right-0.5' : 'right-5',
                )}
              />
            </div>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
