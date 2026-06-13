'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { toShamsiDateTime } from '@/lib/shamsi-utils';
import { Send, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ProfessorMessagesPage() {
  const sp = useSearchParams();
  const initialSpecId = sp.get('specificationId') || '';
  const [selectedSpecId, setSelectedSpecId] = useState(initialSpecId);
  const [content, setContent] = useState('');

  const qc = useQueryClient();
  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });

  const sendBroadcast = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/messages/broadcast', {
        specificationId: selectedSpecId,
        content,
      })).data.data,
    onSuccess: () => {
      toast.success('پیام ارسال شد');
      setContent('');
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <MessageCircle className="inline h-5 w-5 ml-1" />
            ارسال پیام به کلاس
          </CardTitle>
          <CardDescription>
            پیام شما در صندوق ورودی همه دانشجویان این گروه نمایش داده می‌شود
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">انتخاب گروه درسی</label>
            <Select value={selectedSpecId} onValueChange={setSelectedSpecId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کنید..." />
              </SelectTrigger>
              <SelectContent>
                {specs?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.course.name} - {s.course.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">متن پیام</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="پیام خود را بنویسید..."
            />
          </div>
          <Button
            onClick={() => sendBroadcast.mutate()}
            disabled={!content || !selectedSpecId || sendBroadcast.isPending}
          >
            <Send className="h-4 w-4 ml-1" />
            ارسال پیام
          </Button>
        </CardContent>
      </Card>

      <SentMessagesList />
    </div>
  );
}

function SentMessagesList() {
  const qc = useQueryClient();
  const { data: inbox } = useQuery({
    queryKey: ['professor-sent'],
    queryFn: async () => {
      // Reuse message list — professor can see their own broadcasts by checking sender
      const r = await apiClient.get('/inbox');
      return r.data.data.threads;
    },
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>پیام‌های اخیر</CardTitle>
        <CardDescription>پیام‌های ارسالی شما</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(inbox || []).slice(0, 10).map((thread: any) => (
            <div key={thread.rootMessageId} className="border-r-4 border-primary pr-3 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {thread.rootMessage.createdAt.dateShamsi}
                </span>
              </div>
              <p className="text-sm mt-1">{thread.rootMessage.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
