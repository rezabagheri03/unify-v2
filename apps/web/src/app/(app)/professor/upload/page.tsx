'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { useUploadWithProgress } from '@/hooks/useUploadWithProgress';
import { UploadProgressBar } from '@/components/shared/UploadProgressBar';

export default function ProfessorUploadPage() {
  const sp = useSearchParams();
  const specificationId = sp.get('specificationId');
  const { upload, progress, isUploading } = useUploadWithProgress();

  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });
  const spec = specs?.find((s: any) => s.id === specificationId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file || !spec || !title) {
      toast.error('خطا', 'تمام فیلدها الزامی است');
      return;
    }
    setError(null);
    const me = (await apiClient.get('/users/me')).data.data;
    const fd = new FormData();
    fd.append('courseId', spec.course.id);
    fd.append('professorId', me.id);
    fd.append('title', title);
    fd.append('description', description);
    fd.append('file', file);
    fd.append('notifyStudents', String(notify));

    await upload(
      '/resources/upload',
      fd,
      () => {
        toast.success('فایل بارگذاری شد');
        setTitle('');
        setDescription('');
        setFile(null);
      },
      (err: any) => {
        const msg = err?.response?.data?.error?.message || 'خطای ناشناخته';
        setError(msg);
        toast.error('خطا در بارگذاری', msg);
      },
    );
  };

  if (!spec) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">درسی انتخاب نشده است.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>بارگذاری فایل</CardTitle>
        <CardDescription>{spec.course.name} - فایل‌های بارگذاری شده بلافاصله با نشان استاد منتشر می‌شوند.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">توضیحات</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isUploading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">فایل (PDF یا DOCX، حداکثر ۵۰MB)</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isUploading}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="notify"
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            disabled={isUploading}
          />
          <Label htmlFor="notify">ارسال اعلان به دانشجویان</Label>
        </div>

        <UploadProgressBar
          progress={progress}
          isUploading={isUploading}
          filename={file?.name}
          error={error}
        />

        <Button onClick={submit} disabled={isUploading || !file || !title}>
          {isUploading ? 'در حال بارگذاری...' : 'بارگذاری'}
        </Button>
      </CardContent>
    </Card>
  );
}
