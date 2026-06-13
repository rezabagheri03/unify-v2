'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Users, FileCheck, GraduationCap } from 'lucide-react';

export default function ExpertDashboardPage() {
  const { data: courses } = useQuery({
    queryKey: ['dept-courses'],
    queryFn: async () => (await apiClient.get('/expert/courses')).data.data.courses,
  });

  const cards = [
    { title: 'مدیریت دروس', desc: 'ایجاد، ویرایش و حذف دروس گروه', href: '/expert/courses', icon: BookOpen },
    { title: 'گروه‌های درسی', desc: 'تعریف زمان‌بندی، استاد و امتحان', href: '/expert/specifications', icon: Calendar },
    { title: 'دانشجویان', desc: 'لیست دانشجویان گروه', href: '/expert/students', icon: Users },
    { title: 'تیکت‌ها', desc: 'پاسخ به تیکت‌های دانشجویان', href: '/expert/tickets', icon: FileCheck },
    { title: 'چارت درسی', desc: 'بارگذاری چارت درسی گروه', href: '/expert/curriculum', icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>داشبورد کارشناس گروه</CardTitle>
          <CardDescription>تعداد دروس گروه شما: {courses?.length || 0}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.href} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <c.icon className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-medium text-lg">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
              <Button asChild className="mt-4 w-full">
                <Link href={c.href}>ورود</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
