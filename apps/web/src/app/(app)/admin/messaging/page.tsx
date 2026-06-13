'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { MessageCircle, Send, Search } from 'lucide-react';

export default function AdminMessagingPage() {
  const [search, setSearch] = useState('');
  const { data: users } = useQuery({
    queryKey: ['admin-all-students', search],
    queryFn: async () => {
      const r = await apiClient.get(`/admin/users?role=STUDENT&q=${search}`);
      return r.data.data.users || [];
    },
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
            پیام سراسری هدفمند
          </CardTitle>
          <CardDescription>
            پیام به هر دانشجوی دانشگاه با شناسه دانشجویی. در صورت نامعتبر بودن شناسه، خطای «کاربر یافت نشد» نمایش داده می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجو بر اساس نام یا شماره دانشجویی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div>
            <Label>انتخاب دانشجویان ({targets.length})</Label>
            <div className="border rounded-md p-2 max-h-60 overflow-y-auto space-y-1">
              {(users || []).slice(0, 50).map((u: any) => (
                <label key={u.id} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targets.includes(u.id)}
                    onChange={(e) =>
                      setTargets(e.target.checked ? [...targets, u.id] : targets.filter((t) => t !== u.id))
                    }
                  />
                  <span className="text-sm">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}
                    {' '}
                    <span className="text-muted-foreground persian-numerals">({u.username})</span>
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
