'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { PERSIAN_TICKET_DEPT_NAMES, PERSIAN_TICKET_STATUS, toShamsiDateTime } from '@/lib/shamsi-utils';
import { TicketDepartment, TicketStatus } from '@unify/shared-types';
import { Plus, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function StudentTicketsPage() {
  const qc = useQueryClient();
  const { data: tickets } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => (await apiClient.get('/tickets')).data.data.tickets,
  });

  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState<TicketDepartment>(TicketDepartment.EDUCATION);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('department', department);
      formData.append('content', content);
      if (files) Array.from(files).forEach((f) => formData.append('images', f));
      return (await apiClient.post('/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    onSuccess: () => {
      toast.success('تیکت شما ارسال شد');
      setOpen(false);
      setContent('');
      setFiles(null);
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const reply = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) =>
      (await apiClient.post(`/tickets/${ticketId}/reply`, { content })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tickets'] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>تیکت‌های پشتیبانی</CardTitle>
            <CardDescription>پیگیری درخواست‌های شما</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-1" />تیکت جدید</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ارسال تیکت جدید</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>بخش</Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v as TicketDepartment)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TicketDepartment.EDUCATION}>{PERSIAN_TICKET_DEPT_NAMES[TicketDepartment.EDUCATION]}</SelectItem>
                      <SelectItem value={TicketDepartment.STUDENT_AFFAIRS}>{PERSIAN_TICKET_DEPT_NAMES[TicketDepartment.STUDENT_AFFAIRS]}</SelectItem>
                      <SelectItem value={TicketDepartment.TECHNICAL}>{PERSIAN_TICKET_DEPT_NAMES[TicketDepartment.TECHNICAL]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>متن تیکت</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} required minLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>تصاویر (حداکثر ۳ عدد)</Label>
                  <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
                </div>
                <Button type="submit" disabled={create.isPending || content.length < 10}>ارسال</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {(tickets || []).map((t: any) => (
        <Card key={t.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Badge>{PERSIAN_TICKET_DEPT_NAMES[t.department as TicketDepartment]}</Badge>
                <Badge variant={t.status === 'CLOSED' ? 'secondary' : 'default'}>{PERSIAN_TICKET_STATUS[t.status as TicketStatus]}</Badge>
                {t.isEscalated && <Badge variant="destructive">ارجاع شده</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{toShamsiDateTime(new Date(t.createdAt.dateUtc))}</span>
            </div>
            <p>{t.content}</p>
            {t.imageUrls?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {t.imageUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" className="text-xs text-primary underline">
                    تصویر {i + 1}
                  </a>
                ))}
              </div>
            )}

            {/* Replies */}
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

            {/* Reply form (only if open) */}
            {t.status !== 'CLOSED' && (
              <ReplyForm
                onSubmit={(content) => reply.mutate({ ticketId: t.id, content })}
                loading={reply.isPending}
              />
            )}
          </CardContent>
        </Card>
      ))}

      {tickets?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            تیکتی ندارید.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReplyForm({ onSubmit, loading }: { onSubmit: (content: string) => void; loading: boolean }) {
  const [content, setContent] = useState('');
  return (
    <div className="flex gap-2 pt-2 border-t">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="پاسخ شما..." rows={2} />
      <Button onClick={() => { onSubmit(content); setContent(''); }} disabled={!content || loading} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
