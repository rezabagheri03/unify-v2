'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, Check, X, Eye, Clock, CheckCircle } from 'lucide-react';
import { toPersianDigits, toShamsi } from '@/lib/shamsi-utils';

export default function HeadCurriculaPage() {
  const qc = useQueryClient();
  const { data: pending } = useQuery({
    queryKey: ['head-curricula-pending'],
    queryFn: async () => (await apiClient.get('/head/curricula/pending')).data.data.charts,
  });
  const { data: published } = useQuery({
    queryKey: ['head-curricula-published'],
    queryFn: async () => (await apiClient.get('/head/curricula/published')).data.data.charts,
  });

  const [reviewing, setReviewing] = useState<any | null>(null);
  const [sendBackReason, setSendBackReason] = useState('');

  const publish = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/head/curricula/${id}/publish`),
    onSuccess: () => {
      toast.success('چارت تأیید و منتشر شد');
      qc.invalidateQueries({ queryKey: ['head-curricula-pending'] });
      qc.invalidateQueries({ queryKey: ['head-curricula-published'] });
    },
  });

  const sendBack = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/head/curricula/${id}/send-back`, { reason }),
    onSuccess: () => {
      toast.success('چارت برگشت داده شد');
      setSendBackReason('');
      qc.invalidateQueries({ queryKey: ['head-curricula-pending'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <GraduationCap className="inline h-5 w-5 ml-1" />
            تأیید چارت‌های درسی
          </CardTitle>
          <CardDescription>
            چارت‌های بارگذاری شده توسط کارشناسان گروه که نیاز به تأیید نهایی شما دارند.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pending charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            در انتظار تأیید ({pending?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending?.length === 0 && (
            <p className="text-center text-muted-foreground py-6">
              چارت در انتظار تأیید وجود ندارد.
            </p>
          )}
          <div className="space-y-3">
            {pending?.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">سال ورودی {toPersianDigits(c.entryYear)}</p>
                      <p className="text-sm text-muted-foreground">
                        بارگذار توسط: {c.uploadedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        آخرین ویرایش: {c.updatedAtShamsi}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={reviewing?.id === c.id} onOpenChange={(o) => setReviewing(o ? c : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 ml-1" />بررسی
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              بررسی چارت درسی - سال ورودی {toPersianDigits(c.entryYear)}
                            </DialogTitle>
                          </DialogHeader>
                          <CurriculumTreeView chartData={c.chartData} />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        onClick={() => publish.mutate(c.id)}
                        disabled={publish.isPending}
                      >
                        <Check className="h-4 w-4 ml-1" />تأیید و انتشار
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4 ml-1" />برگشت
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>برگشت چارت به کارشناس</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Textarea
                              value={sendBackReason}
                              onChange={(e) => setSendBackReason(e.target.value)}
                              rows={4}
                              placeholder="دلیل برگشت..."
                            />
                            <Button
                              variant="destructive"
                              onClick={() => sendBack.mutate({ id: c.id, reason: sendBackReason })}
                              disabled={sendBack.isPending}
                            >
                              تأیید برگشت
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Published charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            چارت‌های منتشر شده
          </CardTitle>
        </CardHeader>
        <CardContent>
          {published?.length === 0 && (
            <p className="text-center text-muted-foreground py-6">
              چارتی منتشر نشده است.
            </p>
          )}
          <div className="space-y-2">
            {published?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-md">
                <p className="font-medium">سال ورودی {toPersianDigits(c.entryYear)}</p>
                <Badge variant="default" className="bg-green-600">
                  منتشر شده
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CurriculumNode {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  type: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
}

function CurriculumTreeView({ chartData }: { chartData: CurriculumNode[] }) {
  const semesters = Array.from(new Set(chartData.map((n) => n.semester))).sort((a, b) => a - b);

  return (
    <div className="space-y-4 pt-2">
      {semesters.map((sem) => {
        const nodes = chartData.filter((n) => n.semester === sem);
        return (
          <div key={sem} className="border-r-4 border-primary pr-3">
            <p className="font-bold text-sm mb-2">ترم {toPersianDigits(sem)}</p>
            <div className="space-y-2">
              {nodes.map((n) => (
                <Card key={n.courseCode}>
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{n.courseName}</p>
                        <p className="text-xs text-muted-foreground persian-numerals">
                          کد: {n.courseCode} - {toPersianDigits(n.credits)} واحد
                        </p>
                        {n.prerequisites.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 persian-numerals">
                            پیش‌نیاز: {n.prerequisites.join('، ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={n.type === 'REQUIRED' ? 'default' : 'secondary'} className="text-xs">
                        {n.type === 'REQUIRED' ? 'اصلی' : n.type === 'ELECTIVE' ? 'اختیاری' : 'عمومی'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
