'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { Bell, BellOff, MessageCircle, Check } from 'lucide-react';
import { PERSIAN_DAY_NAMES, toPersianDigits } from '@/lib/shamsi-utils';
import { Day } from '@unify/shared-types';
import { useEffect } from 'react';
import { initPushe, getPusheDeviceToken, pusheEnabled } from '@/lib/pushe';

export default function StudentPreferencesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notif-preferences'],
    queryFn: async () => (await apiClient.get('/notifications/preferences')).data.data.preferences,
  });

  // Register Pushe device token on first visit (Golden Doc §1.3.1: National Intranet compliance)
  useEffect(() => {
    if (pusheEnabled) {
      initPushe().then(async () => {
        const token = await getPusheDeviceToken();
        if (token) {
          apiClient.post('/notifications/register-device', { token }).catch(() => {
            // Backend might not have the endpoint yet — ignore
          });
        }
      });
    }
  }, []);

  const { data: finalEnrollments } = useQuery({
    queryKey: ['final-enrollments-for-prefs'],
    queryFn: async () => {
      const r = await apiClient.get('/scheduler/search?q=');
      return (r.data.data.courses as Array<any>).filter((c) => c.isAlreadyEnrolledFinal);
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ specificationId, isMuted }: { specificationId: string; isMuted: boolean }) =>
      (await apiClient.post('/notifications/preferences', { specificationId, isMuted })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-preferences'] }),
    onError: () => toast.error('خطا در ذخیره تنظیمات'),
  });

  const prefs = data || [];
  const isMuted = (specId: string) => prefs.some((p: any) => p.specificationId === specId && p.isMuted);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Bell className="inline h-5 w-5 ml-1" />
            تنظیمات اعلان
          </CardTitle>
          <CardDescription>
            اعلان‌های هر درس را به‌صورت جداگانه خاموش/روشن کنید.
            توجه: هشدارهای بحرانی (تغییر زمان کلاس، لغو گروه) همیشه ارسال می‌شوند.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-2">
        {(finalEnrollments || []).map((c: any) => {
          const muted = isMuted(c.specificationId);
          return (
            <Card key={c.specificationId}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{c.courseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(c.classDays as Day[]).map((d) => PERSIAN_DAY_NAMES[d]).join('، ')} -{' '}
                    {toPersianDigits(c.classStartTime)} تا {toPersianDigits(c.classEndTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {muted ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-primary" />}
                  <Switch
                    checked={!muted}
                    onCheckedChange={(checked) =>
                      toggle.mutate({ specificationId: c.specificationId, isMuted: !checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {finalEnrollments?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              ابتدا در درسی ثبت‌نام نهایی کنید.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
