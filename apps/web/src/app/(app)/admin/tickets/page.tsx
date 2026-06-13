'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { PERSIAN_TICKET_DEPT_NAMES, PERSIAN_TICKET_STATUS, toShamsiDateTime } from '@/lib/shamsi-utils';
import { TicketDepartment, TicketStatus } from '@unify/shared-types';
import { AlertOctagon, Send, X } from 'lucide-react';

export default function AdminTicketsPage() {
  const qc = useQueryClient();
  const { data: tickets } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => (await apiClient.get('/tickets')).data.data.tickets,
  });

  const escalated = (tickets || []).filter((t: any) => t.isEscalated);

  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [text, setText] = useState('');

  const reply = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) =>
      (await apiClient.post(`/tickets/${id}/reply`, { content })).data.data,
    onSuccess: () => {
      toast.success('پاسخ ارسال شد');
      setReplyOpen(null);
      setText('');
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  const close = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/tickets/${id}/close`),
    onSuccess: () => {
      toast.success('تیکت بسته شد');
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <AlertOctagon className="inline h-5 w-5 ml-1" />
            تیکت‌های ارجاعی
          </CardTitle>
          <CardDescription>
            تیکت‌هایی که بیش از ۴۸ ساعت بدون پاسخ مانده‌اند یا به بخش فنی مربوط هستند
          </CardDescription>
        </CardHeader>
      </Card>

      {escalated.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            تیکت ارجاعی وجود ندارد.
          </CardContent>
        </Card>
      )}

      {escalated.map((t: any) => (
        <Card key={t.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="destructive">ارجاعی</Badge>
                <Badge>{PERSIAN_TICKET_DEPT_NAMES[t.department as TicketDepartment]}</Badge>
                <Badge variant={t.status === 'CLOSED' ? 'secondary' : 'default'}>
                  {PERSIAN_TICKET_STATUS[t.status as TicketStatus]}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {t.student?.firstName} {t.student?.lastName} ({t.student?.username})
              </span>
            </div>
            <p>{t.content}</p>
            <p className="text-xs text-muted-foreground">{toShamsiDateTime(new Date(t.createdAt.dateUtc))}</p>

            {t.replies?.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {t.replies.map((r: any) => (
                  <div key={r.id} className="bg-muted p-3 rounded text-sm">
                    <p className="text-xs text-muted-foreground mb-1">
                      {r.senderName} ({r.senderRole}) - {toShamsiDateTime(new Date(r.createdAt.dateUtc))}
                    </p>
                    {r.content}
                  </div>
                ))}
              </div>
            )}

            {t.status !== 'CLOSED' && (
              <div className="pt-2 border-t space-y-2">
                {replyOpen === t.id ? (
                  <>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => reply.mutate({ id: t.id, content: text })} disabled={!text}>
                        <Send className="h-4 w-4 ml-1" />ارسال
                      </Button>
                      <Button variant="ghost" onClick={() => setReplyOpen(null)}>انصراف</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setReplyOpen(t.id)}>پاسخ</Button>
                    <Button size="sm" variant="outline" onClick={() => close.mutate(t.id)}>
                      <X className="h-4 w-4 ml-1" />بستن
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
