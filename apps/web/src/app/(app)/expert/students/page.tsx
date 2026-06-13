'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Send, MessageCircle } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function ExpertStudentsPage() {
  const [search, setSearch] = useState('');
  const { data: students } = useQuery({
    queryKey: ['dept-students'],
    queryFn: async () => (await apiClient.get('/expert/students')).data.data.students,
  });
  const filtered = (students || []).filter(
    (s: any) => !search || s.username.includes(search) || [s.firstName, s.lastName].join(' ').includes(search),
  );

  const [messageOpen, setMessageOpen] = useState(false);
  const [targets, setTargets] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const send = useMutation({
    mutationFn: async () => (await apiClient.post('/messages/direct', { recipientIds: targets, content })).data.data,
    onSuccess: () => {
      toast.success(`پیام به ${targets.length} دانشجو ارسال شد`);
      setMessageOpen(false);
      setTargets([]);
      setContent('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message;
      toast.error('خطا', msg);
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <Users className="inline h-5 w-5 ml-1" />
              دانشجویان گروه
            </CardTitle>
            <CardDescription>
              {toPersianDigits(filtered.length)} دانشجو
            </CardDescription>
          </div>
          {targets.length > 0 && (
            <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 ml-1" />
                  ارسال پیام ({toPersianDigits(targets.length)})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ارسال پیام هدفمند</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                  />
                  <Button
                    onClick={() => send.mutate()}
                    disabled={!content || send.isPending}
                  >
                    ارسال
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2">
            {filtered.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={targets.includes(s.id)}
                    onChange={(e) => {
                      setTargets(e.target.checked ? [...targets, s.id] : targets.filter((t) => t !== s.id));
                    }}
                  />
                  <div>
                    <p className="font-medium">
                      {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.username}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.username}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTargets([s.id]);
                    setMessageOpen(true);
                  }}
                >
                  <MessageCircle className="h-4 w-4 ml-1" />پیام
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
