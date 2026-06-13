'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Users, MessageCircle } from 'lucide-react';

export default function ProfessorStudentsPage() {
  const sp = useSearchParams();
  const specificationId = sp.get('specificationId');
  const qc = useQueryClient();

  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });

  const selectedSpec = specs?.find((s: any) => s.id === specificationId) || specs?.[0];

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');

  const sendBroadcast = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/messages/broadcast', {
        specificationId: selectedSpec?.id,
        content: messageContent,
      })).data.data,
    onSuccess: () => {
      toast.success('پیام به همه دانشجویان ارسال شد');
      setMessageOpen(false);
      setMessageContent('');
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const sendDirect = useMutation({
    mutationFn: async ({ studentId, content }: { studentId: string; content: string }) =>
      (await apiClient.post('/messages/direct', {
        recipientIds: [studentId],
        content,
      })).data.data,
    onSuccess: () => toast.success('پیام ارسال شد'),
  });

  if (!selectedSpec) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          درسی به شما تخصیص داده نشده است.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                <Users className="inline h-5 w-5 ml-1" />
                لیست دانشجویان - {selectedSpec.course.name}
              </CardTitle>
              <CardDescription>
                {toast && selectedSpec.enrolledStudents.length} دانشجو در این گروه ثبت‌نام کرده‌اند
              </CardDescription>
            </div>
            <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
              <DialogTrigger asChild>
                <Button>
                  <MessageCircle className="h-4 w-4 ml-1" />
                  پیام به همه کلاس
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ارسال پیام به دانشجویان {selectedSpec.course.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={5}
                    placeholder="متن پیام..."
                  />
                  <Button
                    onClick={() => sendBroadcast.mutate()}
                    disabled={!messageContent || sendBroadcast.isPending}
                  >
                    <Send className="h-4 w-4 ml-1" />ارسال
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSpec.enrolledStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              هنوز دانشجویی در این گروه ثبت‌نام نکرده است.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedSpec.enrolledStudents.map((s: any) => (
                <DirectMessageRow
                  key={s.id}
                  student={s}
                  onSend={(content) => sendDirect.mutate({ studentId: s.id, content })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DirectMessageRow({ student, onSend }: { student: any; onSend: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div>
        <p className="font-medium">{student.fullName || student.username}</p>
        <p className="text-xs text-muted-foreground">{student.username}</p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <MessageCircle className="h-4 w-4 ml-1" />
            پیام خصوصی
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>پیام به {student.fullName || student.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="متن پیام..."
            />
            <Button
              onClick={() => {
                onSend(text);
                setText('');
                setOpen(false);
              }}
              disabled={!text}
            >
              ارسال
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
