'use client';

import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  progress: { loaded: number; total: number; percent: number } | null;
  isUploading: boolean;
  filename?: string;
  error?: string | null;
}

/**
 * Renders the upload progress bar with percentage + size info.
 * Used by all file-upload forms to satisfy Golden Doc §F.1.
 */
export function UploadProgressBar({ progress, isUploading, filename, error }: Props) {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        <span>خطا در بارگذاری: {error}</span>
      </div>
    );
  }

  if (!isUploading && !progress) return null;

  const percent = progress?.percent ?? 0;
  const loadedMB = (progress?.loaded ?? 0) / 1024 / 1024;
  const totalMB = (progress?.total ?? 0) / 1024 / 1024;

  if (percent >= 100) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        <span>بارگذاری {filename ? `«${filename}» ` : ''}کامل شد</span>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3 w-3 animate-pulse" />
        <span>
          در حال بارگذاری {filename ? `«${filename}»` : 'فایل'}...
          {' '}<span className="persian-numerals">{loadedMB.toFixed(2)} / {totalMB.toFixed(2)} MB</span>
        </span>
      </div>
      <Progress value={percent} />
      <p className="text-xs text-muted-foreground text-left persian-numerals" dir="ltr">
        {percent}%
      </p>
    </div>
  );
}
