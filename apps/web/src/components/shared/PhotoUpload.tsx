'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Trash2, Upload } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { useUploadWithProgress } from '@/hooks/useUploadWithProgress';
import { UploadProgressBar } from '@/components/shared/UploadProgressBar';
import { useAuthStore } from '@/lib/stores/auth.store';
import { apiClient } from '@/lib/api-client';

interface Props {
  currentPhotoUrl: string | null;
  onUploaded: (url: string | null) => void;
}

/**
 * Profile photo uploader (Golden Doc §1.2.5).
 * Stores the URL in the User.supplementaryInfo as PHOTO_URL:...
 * Then refreshes auth store so the avatar updates everywhere.
 */
export function PhotoUpload({ currentPhotoUrl, onUploaded }: Props) {
  const { upload, progress, isUploading } = useUploadWithProgress();
  const [error, setError] = useState<string | null>(null);
  const { user, setUser } = useAuthStore();

  const handleUpload = async (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.append('photo', file);
    await upload(
      '/profile/me/photo',
      fd,
      (data) => {
        const photoUrl = data.data?.photoUrl;
        toast.success('تصویر پروفایل به‌روزرسانی شد');
        onUploaded(photoUrl);
        // Update auth store so avatar updates immediately
        if (user && photoUrl) {
          const supplementaryInfo = `PHOTO_URL:${photoUrl}`;
          setUser({ ...user });
          // Also persist via PATCH /users/me
          apiClient.patch('/users/me', { supplementaryInfo }).catch(() => {});
        }
      },
      (err: any) => {
        const msg = err?.response?.data?.error?.message || 'خطای ناشناخته';
        setError(msg);
        toast.error('خطا در بارگذاری', msg);
      },
    );
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete('/profile/me/photo');
      toast.success('تصویر پروفایل حذف شد');
      onUploaded(null);
    } catch (err: any) {
      toast.error('خطا', err?.response?.data?.error?.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          تصویر پروفایل
        </CardTitle>
        <CardDescription>
          تصویر شما در سایدبار و پروفایلتان نمایش داده می‌شود.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPhotoUrl && (
          <div className="flex justify-center p-4 border rounded-md bg-muted">
            <img
              src={currentPhotoUrl}
              alt="تصویر پروفایل"
              className="h-32 w-32 rounded-full object-cover"
            />
          </div>
        )}

        <UploadProgressBar
          progress={progress}
          isUploading={isUploading}
          error={error}
        />

        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <Button asChild disabled={isUploading} className="w-full cursor-pointer">
              <span>
                <Upload className="h-4 w-4 ml-1" />
                {currentPhotoUrl ? 'تغییر تصویر' : 'بارگذاری تصویر'}
              </span>
            </Button>
          </label>
          {currentPhotoUrl && (
            <Button variant="outline" onClick={handleDelete} disabled={isUploading}>
              <Trash2 className="h-4 w-4 ml-1" />
              حذف
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
