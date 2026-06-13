'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PERSIAN_DAY_NAMES, toPersianDigits } from '@/lib/shamsi-utils';
import { Day } from '@unify/shared-types';
import { Plus, MessageCircle, Users, FileUp } from 'lucide-react';

export default function ProfessorDashboardPage() {
  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>داشبورد استاد</CardTitle>
          <CardDescription>مدیریت دروس، فایل‌ها و ارتباط با دانشجویان</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {(specs || []).map((s: any) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{s.course.name}</CardTitle>
                  <CardDescription>
                    {s.course.code} - {(s.classDays as Day[]).map((d) => PERSIAN_DAY_NAMES[d]).join('، ')} - {s.classStartTime} تا {s.classEndTime}
                  </CardDescription>
                </div>
                <Badge>{toPersianDigits(s.enrolledStudents.length)} دانشجو</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">مکان: {s.classroomLocation}</p>
              <div className="flex gap-2 flex-wrap">
                <Button asChild size="sm">
                  <Link href={`/professor/upload?specificationId=${s.id}`}>
                    <FileUp className="h-4 w-4 ml-1" />
                    بارگذاری فایل
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/professor/messages?specificationId=${s.id}`}>
                    <MessageCircle className="h-4 w-4 ml-1" />
                    پیام به کلاس
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/professor/students?specificationId=${s.id}`}>
                    <Users className="h-4 w-4 ml-1" />
                    لیست دانشجویان
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {specs?.length === 0 && (
          <Card><CardContent className="text-center py-12 text-muted-foreground">درسی به شما تخصیص داده نشده است.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
