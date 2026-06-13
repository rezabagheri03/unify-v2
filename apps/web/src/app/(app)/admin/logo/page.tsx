'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';

export default function AdminLogoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) {
      toast.error('فایلی انتخاب نشده');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/admin/logo', {
        method: 'POST',
        body: fd,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('unify-auth') ? JSON.parse(localStorage.getItem('unify-auth')!).state.accessToken : ''}`,
        },
      });
      if (!res.ok) throw new Error('خطا در بارگذاری');
      toast.success('لوگو به‌روزرسانی شد');
    } catch (err) {
      toast.error('خطا', err instanceof Error ? err.message : 'ناموفق');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <ImageIcon className="inline h-5 w-5 ml-1" />
            مدیریت لوگوی سامانه
          </CardTitle>
          <CardDescription>لوگوی صفحه ورود و گوشه سایدبار</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {previewUrl && (
            <div className="border rounded p-4 flex justify-center">
              <img src={previewUrl} alt="Preview" className="max-h-32" />
            </div>
          )}
          <Button onClick={upload} disabled={!file || loading}>
            {loading ? 'در حال بارگذاری...' : 'بارگذاری لوگو'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
