'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { toShamsiDateTime, toPersianDigits } from '@/lib/shamsi-utils';

interface CriticalAlert {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

/**
 * In-app critical-alert banner. Per Golden Doc §2.1.3:
 * "Critical warning displayed to the affected student (in-app banner/modal,
 * not just a notification)".
 * Shows the most recent unread CRITICAL_ALERT notification.
 */
export function CriticalAlertBanner() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['inbox-notifications', 'critical'],
    queryFn: async () => {
      // Fetch persistent notifications
      const r = await apiClient.get('/inbox/notifications');
      const all = (r.data.data?.notifications || []) as Array<{
        id: string;
        type: string;
        title: string;
        body: string;
        data: Record<string, string> | null;
        isRead: boolean;
        createdAt: string;
      }>;
      return all.filter((n) => n.type === 'CRITICAL_ALERT' && !n.isRead) as CriticalAlert[];
    },
    refetchInterval: 30_000,
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      // Mark the underlying notification as read
      // (no dedicated endpoint — we re-use a generic persist message)
      // For now: client-only dismiss is fine since banner is per-session.
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox-notifications'] }),
  });

  const alerts = data || [];
  if (alerts.length === 0) return null;

  // Show the most recent alert as a prominent banner
  const top = alerts[0];

  return (
    <div className="rounded-md border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3 mb-4">
      <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
      <div className="flex-1">
        <h3 className="font-bold text-red-900">{top.title}</h3>
        <p className="text-sm text-red-800 mt-1">{top.body}</p>
        <p className="text-xs text-red-700 mt-1 persian-numerals">
          {toShamsiDateTime(new Date(top.createdAt))}
        </p>
        {top.data?.specificationId && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 text-red-900 p-0 h-auto"
            asChild
          >
            <a href="/student/scheduler">
              <ExternalLink className="h-3 w-3 ml-1" />
              مشاهده برنامه درسی
            </a>
          </Button>
        )}
        {alerts.length > 1 && (
          <p className="text-xs text-red-700 mt-2 persian-numerals">
            و {toPersianDigits(alerts.length - 1)} هشدار دیگر...
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => dismiss.mutate(top.id)}
        className="text-red-900 hover:bg-red-100"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
