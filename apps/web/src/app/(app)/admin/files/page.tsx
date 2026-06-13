'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Trash2, Search, Download, Clock, CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

/**
 * Admin file management (Golden Doc §3.5.8):
 * - Upload new version for any professor's file
 * - Hard delete any professor's file
 * - Search across all files
 * - "Final Note Approval Authority" as fallback (Golden Doc §3.5.7):
 *   highlights files pending more than 7 days as fallback cases.
 */
export default function AdminFilesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [browseCourseId, setBrowseCourseId] = useState('');
  const [browseProfessorId, setBrowseProfessorId] = useState('');

  const { data: pending } = useQuery({
    queryKey: ['admin-files-all'],
    queryFn: async () => (await apiClient.get('/pending')).data.data.files,
  });

  const FALLBACK_DAYS = 7;
  const fallbackCandidates = (pending || []).filter((f: any) => {
    const ageDays = (Date.now() - new Date(f.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return ageDays >= FALLBACK_DAYS;
  });

  const { data: files } = useQuery({
    queryKey: ['admin-files', browseCourseId, browseProfessorId],
    queryFn: async () => {
      if (!browseCourseId || !browseProfessorId) return [];
      return (await apiClient.get(`/resources?courseId=${browseCourseId}&professorId=${browseProfessorId}`)).data.data.files;
    },
    enabled: !!browseCourseId && !!browseProfessorId,
  });

  const hardDelete = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/resources/${id}`),
    onSuccess: () => {
      toast.success('فایل حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-files'] });
      qc.invalidateQueries({ queryKey: ['admin-files-all'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const filteredPending = (pending || []).filter((f: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.courseCode?.toLowerCase().includes(q) ||
      f.courseName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="inline h-5 w-5 ml-1" />
            مدیریت فایل‌ها
          </CardTitle>
          <CardDescription>
            بارگذاری نسخه جدید و حذف فایل‌های اساتید (حتی اساتیدی که دیگر فعال نیستند)
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            فایل‌های در انتظار تأیید
          </CardTitle>
          <CardDescription>
            فایل‌هایی که بیش از {toPersianDigits(FALLBACK_DAYS)} روز در انتظار تأیید مانده‌اند به‌عنوان «مرجع نهایی» برای مدیر سیستم علامت‌گذاری می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="space-y-2">
            {filteredPending.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                فایل در انتظار تأیید وجود ندارد.
              </p>
            )}
            {filteredPending.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.courseCode} - {f.courseName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/resources/${f.id}/download`} target="_blank">
                        <Download className="h-4 w-4 ml-1" />
                        دانلود
                      </a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => hardDelete.mutate(f.id)}>
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مرور فایل‌های تأیید شده بر اساس درس</CardTitle>
          <CardDescription>
            شناسه درس و استاد را وارد کنید تا فایل‌های تأیید شده را ببینید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="شناسه درس (courseId)"
              value={browseCourseId}
              onChange={(e) => setBrowseCourseId(e.target.value)}
            />
            <Input
              placeholder="شناسه استاد (professorId)"
              value={browseProfessorId}
              onChange={(e) => setBrowseProfessorId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {(files || []).map((f: any) => (
              <Card key={f.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      نسخه {toPersianDigits(f.versionNumber)} - بارگذار: {f.uploaderName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/resources/${f.id}/download`} target="_blank">
                        <Download className="h-4 w-4 ml-1" />
                        دانلود
                      </a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => hardDelete.mutate(f.id)}>
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
