/**
 * src/lib/pushe.ts — Pushe push notification integration (Iranian National Intranet).
 *
 * Production usage:
 * 1. Install real Pushe Web SDK (pushe-web-sdk) on the frontend
 * 2. Set NEXT_PUBLIC_PUSHE_APP_ID in .env
 * 3. Register device token after login (handled here)
 *
 * This module safely no-ops when Pushe credentials are not configured.
 * For real SDK install, replace the stub below with actual pushe-web-sdk calls.
 */

const PUSHE_APP_ID = process.env.NEXT_PUBLIC_PUSHE_APP_ID || '';
const PUSHE_ENABLED = Boolean(PUSHE_APP_ID);

declare global {
  interface Window {
    Pushe?: {
      init: (appId: string) => Promise<void>;
      getToken: () => Promise<string>;
      onNotificationReceived: (cb: (data: Record<string, unknown>) => void) => void;
    };
  }
}

let initialized = false;

/** Initialize Pushe SDK on the client. Safe to call multiple times. */
export async function initPushe(): Promise<void> {
  if (!PUSHE_ENABLED || typeof window === 'undefined' || initialized) return;
  if (!window.Pushe) {
    // Real Pushe SDK not loaded. To enable:
    //   npm install pushe-web-sdk
    //   Add Pushe SDK script tag to app/layout.tsx
    //   Set NEXT_PUBLIC_PUSHE_APP_ID in .env
    return;
  }
  try {
    await window.Pushe.init(PUSHE_APP_ID);
    initialized = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Pushe init failed:', err);
  }
}

/** Get the device token for the current browser/device. */
export async function getPusheDeviceToken(): Promise<string | null> {
  if (!PUSHE_ENABLED || typeof window === 'undefined') return null;
  if (!window.Pushe) return null;
  try {
    await initPushe();
    return await window.Pushe.getToken();
  } catch {
    return null;
  }
}

/** Register for in-app notification events (when app is open). */
export function onPusheNotification(cb: (data: Record<string, unknown>) => void): () => void {
  if (!PUSHE_ENABLED || typeof window === 'undefined' || !window.Pushe) {
    return () => {};
  }
  window.Pushe.onNotificationReceived(cb);
  return () => {
    // Pushe SDK doesn't expose unsubscribe, but we no-op the callback
  };
}

export const pusheEnabled = PUSHE_ENABLED;
