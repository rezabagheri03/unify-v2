'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { FileText, Send, Paperclip } from 'lucide-react';
import { PERSIAN_TICKET_DEPT_NAMES, PERSIAN_TICKET_STATUS, toShamsiDateTime } from '@/lib/shamsi-utils';
import { TicketDepartment, TicketStatus } from '@unify/shared-types';

export default function ExpertTicketsPage() {
  const qc = useQueryClient();
  const { data: tickets } = useQuery({
    queryKey: ['expert-tickets'],
    queryFn: async () => (await apiClient.get('/tickets')).data.data.tickets,
  });

  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const reply = useMutation({
    mutationFn: async ({ ticketId, content, attachment }: { ticketId: string; content: string; attachment: File | null }) => {
      const fd = new FormData();
      fd.append('content', content);
      if (attachment) fd.append('attachment', attachment);
      return (await apiClient.post(`/tickets/${ticketId}/reply`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data.data;
    },
    onSuccess: () => {
      toast.success('پاسخ ارسال شد');
      setReplyOpen(null);
      setReplyText('');
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ['expert-tickets'] });
    },
  });

  const close = useMutation({
    mutationFn: async (ticketId: string) => apiClient.patch(`/tickets/${ticketId}/close`),
    onSuccess: () => {
      toast.success('تیکت بسته شد');
      qc.invalidateQueries({ queryKey: ['expert-tickets'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="inline h-5 w-5 ml-1" />
            تیکت‌های ارجاعی به شما
          </CardTitle>
          <CardDescription>تیکت‌های دانشجویان گروه شما</CardDescription>
        </CardHeader>
      </Card>

      {(tickets || []).map((t: any) => (
        <Card key={t.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Badge>{PERSIAN_TICKET_DEPT_NAMES[t.department as TicketDepartment]}</Badge>
                <Badge variant={t.status === 'CLOSED' ? 'secondary' : 'default'}>
                  {PERSIAN_TICKET_STATUS[t.status as TicketStatus]}
                </Badge>
                {t.isEscalated && <Badge variant="destructive">ارجاع شده</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">
                از: {t.student?.firstName} {t.student?.lastName} ({t.student?.username})
              </span>
            </div>
            <p>{t.content}</p>
            <p className="text-xs text-muted-foreground">
              ارسال: {toShamsiDateTime(new Date(t.createdAt.dateUtc))}
            </p>

            {t.replies?.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {t.replies.map((r: any) => (
                  <div key={r.id} className="bg-muted p-3 rounded">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{r.senderName} ({r.senderRole})</span>
                      <span>{toShamsiDateTime(new Date(r.createdAt.dateUtc))}</span>
                    </div>
                    <p className="text-sm">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {t.status !== 'CLOSED' && (
              <div className="pt-2 border-t space-y-2">
                {replyOpen === t.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="پاسخ شما..."
                    />
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                      />
                      <Button
                        onClick={() => reply.mutate({ ticketId: t.id, content: replyText, attachment })}
                        disabled={!replyText || reply.isPending}
                      >
                        <Send className="h-4 w-4 ml-1" />ارسال
                      </Button>
                      <Button variant="ghost" onClick={() => setReplyOpen(null)}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setReplyOpen(t.id)}>
                      <Send className="h-4 w-4 ml-1" />پاسخ
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => close.mutate(t.id)}>
                      بستن تیکت
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {tickets?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            تیکتی برای شما وجود ندارد.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
