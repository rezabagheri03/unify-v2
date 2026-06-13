'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { PERSIAN_PHASE_NAMES } from '@/lib/shamsi-utils';
import { Phase } from '@unify/shared-types';
import { Power, PowerOff, Settings as SettingsIcon } from 'lucide-react';

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const { data: state } = useQuery({
    queryKey: ['system-state'],
    queryFn: async () => (await apiClient.get('/system/state')).data.data,
  });

  const changePhase = useMutation({
    mutationFn: async (phase: Phase) => (await apiClient.patch('/admin/phase', { phase })).data.data,
    onSuccess: (data) => {
      toast.success('فاز تغییر کرد', `فاز جدید: ${PERSIAN_PHASE_NAMES[data.newPhase as Phase]}`);
      qc.invalidateQueries({ queryKey: ['system-state'] });
    },
  });

  const phase = state?.currentPhase || Phase.ENROLLMENT;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>داشبورد مدیر سیستم</CardTitle>
          <CardDescription>کنترل سیستم‌های سراسری</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">نیم‌سال جاری</p>
              <p className="text-lg font-medium">{state?.currentSemester?.name || 'تعریف نشده'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">فاز جاری</p>
              <Badge className="mt-1">{PERSIAN_PHASE_NAMES[phase as Phase]}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاریخ آخرین تغییر فاز</p>
              <p className="text-sm">{state?.phaseSwitchedAt?.dateShamsi || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تغییر فاز سیستم</CardTitle>
          <CardDescription>با احتیاط استفاده کنید - این عملیات ممیزی می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={phase === Phase.ENROLLMENT ? 'default' : 'outline'}
              onClick={() => changePhase.mutate(Phase.ENROLLMENT)}
              disabled={changePhase.isPending}
            >
              <Power className="h-4 w-4 ml-1" />
              فاز ثبت‌نام (A)
            </Button>
            <Button
              variant={phase === Phase.ACTIVE ? 'default' : 'outline'}
              onClick={() => changePhase.mutate(Phase.ACTIVE)}
              disabled={changePhase.isPending}
            >
              فاز فعال (B)
            </Button>
            <Button
              variant={phase === Phase.EXAM ? 'default' : 'outline'}
              onClick={() => changePhase.mutate(Phase.EXAM)}
              disabled={changePhase.isPending}
            >
              فاز امتحان (C)
            </Button>
          </div>
          {phase === Phase.ACTIVE && state?.gracePeriodEndsAt && (
            <p className="text-sm text-yellow-600 mt-3">
              مهلت ۲۴ ساعته تا <span className="persian-numerals">{state.gracePeriodEndsAt.dateShamsi}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
