'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Activity, Lock } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function OwnerDashboardPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await apiClient.get('/owner/analytics')).data.data,
  });

  const stats = [
    { label: 'کاربران فعال روزانه', value: analytics?.activeUsers?.daily, icon: Users },
    { label: 'کاربران فعال هفتگی', value: analytics?.activeUsers?.weekly, icon: Users },
    { label: 'تیکت‌های فعال', value: analytics?.engagement?.ticketsTotal, icon: FileText },
    { label: 'تیکت‌های ارجاعی', value: analytics?.engagement?.ticketsEscalated, icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>داشبورد مدیر ارشد سیستم</CardTitle>
          <CardDescription>دسترسی مطلق به تمام بخش‌های سیستم</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <s.icon className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold persian-numerals">{toPersianDigits(s.value || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>مدیریت کاربران</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">ایجاد، تغییر نقش، بازنشانی رمز عبور</p>
            <Button asChild className="w-full"><Link href="/owner/users">ورود</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>لاگ ممیزی</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">تمام عملیات حساس سیستم</p>
            <Button asChild className="w-full" variant="outline"><Link href="/owner/audit">مشاهده</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>تحلیل‌ها</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">آمار و نمودارهای استفاده</p>
            <Button asChild className="w-full" variant="outline"><Link href="/owner/analytics">مشاهده</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
