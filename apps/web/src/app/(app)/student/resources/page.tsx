'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { toPersianDigits } from '@/lib/shamsi-utils';
import { Star, FileText, Download, MessageSquare, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function StudentResourcesPage() {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [professorId, setProfessorId] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');

  const { data: courses } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const r = await apiClient.get('/scheduler/search?q=');
      return (r.data.data.courses as Array<any>).filter((c) => c.isAlreadyEnrolledFinal);
    },
  });

  // Auto-select first course on mount
  useState(() => {
    if (!courseId && courses && courses.length > 0) {
      setCourseId(courses[0].courseId);
      setProfessorId(courses[0].professorId);
    }
    return null;
  });

  const { data: files } = useQuery({
    queryKey: ['files', courseId, professorId, sort],
    queryFn: async () => {
      if (!courseId || !professorId) return [];
      return (await apiClient.get(`/resources?courseId=${courseId}&professorId=${professorId}&sort=${sort}`)).data.data.files;
    },
    enabled: !!courseId && !!professorId,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>هاب منابع</CardTitle>
          <CardDescription>دانلود فایل‌های اساتید و سایر دانشجویان</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            value={courseId || ''}
            onChange={(e) => {
              const selected = courses?.find((c) => c.courseId === e.target.value);
              if (selected) {
                setCourseId(selected.courseId);
                setProfessorId(selected.professorId);
              }
            }}
            className="w-full border rounded-md p-2 bg-background"
          >
            {courses?.map((c: any) => (
              <option key={c.specificationId} value={c.courseId}>
                {c.courseName} - {c.professorName}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant={sort === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSort('newest')}>
              جدیدترین
            </Button>
            <Button variant={sort === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSort('oldest')}>
              قدیمی‌ترین
            </Button>
            <Button variant={sort === 'top_rated' ? 'default' : 'outline'} size="sm" onClick={() => setSort('top_rated')}>
              بالاترین امتیاز
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(files || []).map((f: any) => (
          <FileCard key={f.id} file={f} />
        ))}
        {files?.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              فایلی برای این درس موجود نیست.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FileCard({ file }: { file: any }) {
  const qc = useQueryClient();
  const [rateOpen, setRateOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Golden Doc §2.3.7: "When: A popup appears after a student downloads a file"
  const [downloadCount, setDownloadCount] = useState(0);

  const rate = useMutation({
    mutationFn: async (stars: number) => (await apiClient.post(`/resources/${file.id}/rate`, { stars })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('امتیاز ثبت شد');
      setRateOpen(false);
    },
  });

  // Auto-open rate dialog after first download (if user hasn't rated yet)
  useEffect(() => {
    if (downloadCount > 0 && !file.userRating && !rateOpen) {
      // Small delay so the download actually starts first
      const timer = setTimeout(() => setRateOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [downloadCount, file.userRating, rateOpen]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-medium">{file.title}</h3>
              <p className="text-sm text-muted-foreground">توسط {file.uploaderName}</p>
              {/* Golden Doc §2.3.6: Display date reflects latest version */}
              {file.versionNumber > 1 && (
                <p className="text-xs text-muted-foreground persian-numerals">
                  نسخه {toPersianDigits(file.versionNumber)} - آخرین به‌روزرسانی: {file.latestVersionAt?.dateShamsi || file.createdAt.dateShamsi}
                </p>
              )}
              {file.description && <p className="text-sm mt-1">{file.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                {file.badgeType === 'PROFESSOR_BADGE' && <Badge className="bg-green-600"><Check className="h-3 w-3 ml-1" />استاد</Badge>}
                {file.badgeType === 'GENERAL_BADGE' && <Badge variant="secondary">تأیید شده</Badge>}
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="persian-numerals">{toPersianDigits(file.averageRating.toFixed(1))}</span>
                  <span className="text-muted-foreground persian-numerals">({toPersianDigits(file.ratingCount)})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Trigger download + auto-open rate dialog (§2.3.7)
                window.open(`/api/resources/${file.id}/download`, '_blank');
                setDownloadCount((c) => c + 1);
              }}
            >
              <Download className="h-4 w-4 ml-1" />
              دانلود
            </Button>
            <Dialog open={rateOpen} onOpenChange={setRateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Star className="h-4 w-4 ml-1" />
                  امتیاز
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>امتیاز به فایل</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => rate.mutate(n)} className="p-2 hover:scale-110 transition-transform">
                      <Star className={`h-8 w-8 ${n <= (file.userRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 ml-1" />
                  یادداشت
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>یادداشت شخصی</DialogTitle>
                </DialogHeader>
                <Textarea
                  defaultValue={file.userStickyNote || ''}
                  onBlur={async (e) => {
                    await apiClient.post(`/resources/${file.id}/sticky-note`, { noteText: e.target.value });
                    qc.invalidateQueries({ queryKey: ['files'] });
                    toast.success('یادداشت ذخیره شد');
                  }}
                  placeholder="یادداشت شما (فقط برای خودتان قابل مشاهده است)"
                  rows={4}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
