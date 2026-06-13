'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toaster';
import { MessageCircle, Send, Check } from 'lucide-react';

export default function ExpertMessagingPage() {
  const { data: students } = useQuery({
    queryKey: ['dept-students-for-msg'],
    queryFn: async () => (await apiClient.get('/expert/students')).data.data.students,
  });

  const [targets, setTargets] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const send = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/messages/direct', { recipientIds: targets, content })).data.data,
    onSuccess: () => {
      toast.success(`پیام به ${targets.length} دانشجو ارسال شد`);
      setContent('');
      setTargets([]);
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <MessageCircle className="inline h-5 w-5 ml-1" />
            پیام هدفمند به دانشجویان گروه
          </CardTitle>
          <CardDescription>
            پیام به یک یا چند دانشجوی مشخص ارسال می‌شود. اگر شناسه‌ای نامعتبر باشد، سیستم خطای «کاربر یافت نشد» برمی‌گرداند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>انتخاب دانشجویان ({targets.length})</Label>
            <div className="border rounded-md p-2 max-h-60 overflow-y-auto space-y-1">
              {(students || []).map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets.includes(s.id)}
                    onChange={(e) =>
                      setTargets(e.target.checked ? [...targets, s.id] : targets.filter((t) => t !== s.id))
                    }
                  />
                  <span className="text-sm">
                    {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.username}
                    {' '}
                    <span className="text-muted-foreground persian-numerals">({s.username})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>متن پیام</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="پیام خود را بنویسید..."
            />
          </div>
          <Button onClick={() => send.mutate()} disabled={!targets.length || !content || send.isPending}>
            <Send className="h-4 w-4 ml-1" />ارسال به {targets.length} دانشجو
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
