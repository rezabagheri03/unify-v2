'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, FileText, Clock } from 'lucide-react';
import { useState } from 'react';

export default function PendingApprovalsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => (await apiClient.get('/pending')).data.data.files,
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.patch(`/resources/${id}/approve`, { decision: 'approve' })).data.data,
    onSuccess: () => {
      toast.success('فایل تأیید شد');
      qc.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });

  const reject = useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.patch(`/resources/${id}/approve`, { decision: 'reject' })).data.data,
    onSuccess: () => {
      toast.success('فایل رد شد');
      qc.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="inline h-5 w-5 ml-1" />
            فایل‌های در انتظار تأیید
          </CardTitle>
          <CardDescription>
            فایل‌های بارگذاری شده توسط دانشجویان که نیاز به بررسی دارند
          </CardDescription>
        </CardHeader>
      </Card>

      {(data || []).map((f: any) => (
        <Card key={f.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground">
                  درس: {f.courseCode} - {f.courseName}
                </p>
                <p className="text-sm text-muted-foreground">
                  بارگذار توسط: {f.uploaderName}
                </p>
                {f.description && <p className="text-sm mt-2">{f.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  نسخه {f.versionNumber} - حجم: {(f.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Badge>{f.fileType}</Badge>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button asChild size="sm" variant="outline">
                <a href={`/api/resources/${f.id}/download`} target="_blank">
                  <FileText className="h-4 w-4 ml-1" />مشاهده فایل
                </a>
              </Button>
              <Button size="sm" onClick={() => approve.mutate(f.id)} disabled={approve.isPending}>
                <CheckCircle className="h-4 w-4 ml-1" />تأیید
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reject.mutate(f.id)} disabled={reject.isPending}>
                <XCircle className="h-4 w-4 ml-1" />رد
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {data?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            فایل در انتظار تأیید وجود ندارد.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
