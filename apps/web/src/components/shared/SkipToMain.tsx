'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Accessibility helper: a "skip to main content" link that appears when the
 * user tabs into the page. WCAG 2.1 AA §2.4.1 Bypass Blocks.
 * Also provides skip-to-sidebar for users using keyboard navigation.
 */
export function SkipToMain() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Show on first Tab press anywhere
      if (e.key === 'Tab' && !visible) {
        setVisible(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  return (
    <div
      className={`fixed top-2 left-2 z-50 flex gap-1 transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="navigation"
      aria-label="پرش به بخش‌های اصلی"
    >
      <Button asChild variant="default" size="sm">
        <a
          href="#main-content"
          onClick={() => setVisible(false)}
          aria-label="پرش به محتوای اصلی"
        >
          پرش به محتوا
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href="#sidebar-nav"
          onClick={() => setVisible(false)}
          aria-label="پرش به منوی ناوبری"
        >
          پرش به منو
        </a>
      </Button>
    </div>
  );
}
