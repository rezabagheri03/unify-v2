'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, onSocketEvent, LiveNotification } from '@/lib/socket-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toast } from '@/components/ui/toaster';

/**
 * Boots Socket.io when a user logs in, disconnects on logout.
 * - Refreshes inbox on incoming messages.
 * - Shows toasts for new notifications.
 * - Critical alerts are also shown via the dashboard banner hook.
 */
export function SocketBootstrap() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket();
    if (!socket) return;

    const offNotif = onSocketEvent<LiveNotification>('notification', (n) => {
      // Always re-fetch persistent notifications (inbox)
      qc.invalidateQueries({ queryKey: ['inbox'] });
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });

      // Toast user-visible notifications (skip silent ones)
      if (n.type !== 'SYSTEM_INTERNAL') {
        const variant = n.type === 'CRITICAL_ALERT' ? 'warning' : 'default';
        toast({
          title: n.title,
          description: n.body,
          variant: variant as 'default' | 'warning' | 'destructive' | 'success',
        });
      }
    });

    const offMsg = onSocketEvent('message', () => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
    });

    return () => {
      offNotif();
      offMsg();
    };
  }, [accessToken, qc]);

  return null;
}
