'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts for power users.
 * - g + h: go home/dashboard
 * - g + s: go to scheduler
 * - g + i: go to inbox
 * - g + t: go to tickets
 * - g + r: go to resources
 * - ?: show keyboard help (could open a modal — kept as comment for now)
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let lastKey = '';
    let lastTime = Date.now();

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) {
          return;
        }
      }

      const now = Date.now();
      if (now - lastTime > 1500) {
        lastKey = '';
      }
      lastTime = now;

      const key = e.key.toLowerCase();
      if (lastKey === 'g' && key !== 'g') {
        const routes: Record<string, string> = {
          h: '/student/dashboard',
          s: '/student/scheduler',
          i: '/student/inbox',
          t: '/student/tickets',
          r: '/student/resources',
          u: '/student/utilities',
          p: '/student/preferences',
          e: '/settings',
        };
        const route = routes[key];
        if (route) {
          e.preventDefault();
          router.push(route);
          lastKey = '';
          return;
        }
      }
      if (key === 'g' && lastKey !== 'g') {
        lastKey = 'g';
        return;
      }
      lastKey = '';
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return null;
}
