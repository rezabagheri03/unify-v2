'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Calendar } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function StudentNoticesPage() {
  const { data: searchResults } = useQuery({
    queryKey: ['my-courses-for-notices'],
    queryFn: async () => (await apiClient.get('/scheduler/search?q=')).data.data.courses,
  });

  const finals = (searchResults || []).filter((c: any) => c.isAlreadyEnrolledFinal);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Auto-select first course on mount
  if (!selectedCourseId && finals.length > 0) {
    setSelectedCourseId(finals[0].courseId);
  }

  const { data: notices } = useQuery({
    queryKey: ['student-notices', selectedCourseId],
    queryFn: async () =>
      selectedCourseId
        ? (await apiClient.get(`/notices/${selectedCourseId}`)).data.data.notices
        : [],
    enabled: !!selectedCourseId,
  });

  const { data: faqs } = useQuery({
    queryKey: ['student-faqs', selectedCourseId],
    queryFn: async () =>
      selectedCourseId
        ? (await apiClient.get(`/faq/${selectedCourseId}`)).data.data.faqs
        : [],
    enabled: !!selectedCourseId,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Bell className="inline h-5 w-5 ml-1" />
            تابلو اعلانات و سؤالات متداول
          </CardTitle>
          <CardDescription>از هر درس، اطلاعیه‌ها و سؤالات متداول را ببینید.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="انتخاب درس..." />
              </SelectTrigger>
              <SelectContent>
                {finals.map((c: any) => (
                  <SelectItem key={c.courseId} value={c.courseId}>
                    {c.courseName} - {c.courseCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              اطلاعیه‌ها
            </CardTitle>
            <CardDescription>
              {selectedCourseId ? `${toPersianDigits((notices || []).length)} مورد` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(notices || []).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                اطلاعیه‌ای برای این درس ثبت نشده است.
              </p>
            ) : (
              (notices || []).map((n: any) => (
                <div key={n.id} className="border-r-4 border-primary pr-3 py-2" role="article">
                  <h3 className="font-medium">{n.title}</h3>
                  <p className="text-sm mt-1">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2 persian-numerals">
                    <Calendar className="inline h-3 w-3 ml-1" />
                    {n.createdAt}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>سؤالات متداول</CardTitle>
            <CardDescription>
              {selectedCourseId ? `${toPersianDigits((faqs || []).length)} سؤال` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(faqs || []).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                سؤالی برای این درس ثبت نشده است.
              </p>
            ) : (
              (faqs || []).map((f: any) => (
                <details key={f.id} className="border rounded-md p-3">
                  <summary className="font-medium cursor-pointer">{f.question}</summary>
                  <p className="text-sm text-muted-foreground mt-2">{f.answer}</p>
                </details>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
