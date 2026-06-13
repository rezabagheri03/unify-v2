'use client';

import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getCsrfToken } from '@/lib/csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UseUploadResult {
  upload: (
    url: string,
    formData: FormData,
    onSuccess?: (data: any) => void,
    onError?: (err: any) => void,
  ) => Promise<void>;
  progress: UploadProgress | null;
  isUploading: boolean;
  reset: () => void;
}

/**
 * Reusable hook for file uploads with progress tracking.
 * Golden Doc §F.1: "File Upload (50MB): Progress indicator must be shown; no UI timeout"
 */
export function useUploadWithProgress(): UseUploadResult {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { accessToken } = useAuthStore();

  const reset = useCallback(() => {
    setProgress(null);
    setIsUploading(false);
  }, []);

  const upload = useCallback(
    async (url: string, formData: FormData, onSuccess?: (data: any) => void, onError?: (err: any) => void) => {
      setIsUploading(true);
      setProgress({ loaded: 0, total: 0, percent: 0 });
      try {
        const config: AxiosRequestConfig = {
          url: `${API_URL}/api${url}`,
          method: 'POST',
          data: formData,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
            // Do NOT set Content-Type — let axios compute multipart boundary.
          },
          withCredentials: true,
          onUploadProgress: (pe) => {
            setProgress({
              loaded: pe.loaded,
              total: pe.total || 0,
              percent: pe.total ? Math.round((pe.loaded / pe.total) * 100) : 0,
            });
          },
        };
        const res = await axios.request(config);
        onSuccess?.(res.data);
      } catch (err) {
        onError?.(err);
      } finally {
        setIsUploading(false);
        // Keep progress visible briefly so user sees "100%" before clearing
        setTimeout(() => setProgress(null), 600);
      }
    },
    [accessToken],
  );

  return { upload, progress, isUploading, reset };
}
