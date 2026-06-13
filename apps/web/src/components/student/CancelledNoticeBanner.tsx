'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

interface CancelledNotice {
  id: string;
  courseCode: string;
  courseName: string;
  professorName: string;
  semesterName: string;
  credits: number;
  deletedAtShamsi: string;
  expiresAtShamsi: string;
  daysRemaining: number;
}

/**
 * In-app banner showing 7-day cancelled-spec notices (Agent Guide Decision 5).
 * Appears on the student dashboard.
 */
export function CancelledNoticeBanner() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['cancelled-notices'],
    queryFn: async () => (await apiClient.get('/cancelled-notices/me/active')).data.data.notices,
    refetchInterval: 60_000,
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/cancelled-notices/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cancelled-notices'] }),
  });

  const notices: CancelledNotice[] = (data as CancelledNotice[]) || [];
  if (notices.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {notices.map((n) => (
        <div
          key={n.id}
          className="rounded-md border-2 border-orange-500 bg-orange-50 p-4 flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-orange-900">
              لغو گروه درسی: {n.courseName}
            </h3>
            <p className="text-sm text-orange-800 mt-1">
              گروه درسی <strong>{n.courseCode}</strong> ({n.professorName}) در نیم‌سال{' '}
              <strong>{n.semesterName}</strong> توسط گروه لغو شد.
            </p>
            <p className="text-xs text-orange-700 mt-2 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                ثبت در {n.deletedAtShamsi} - این پیام تا {toPersianDigits(n.daysRemaining)} روز دیگر نمایش داده می‌شود
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dismiss.mutate(n.id)}
            className="text-orange-900 hover:bg-orange-100"
            aria-label="بستن پیام"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
