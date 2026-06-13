'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { toShamsiDateTime, toPersianDigits } from '@/lib/shamsi-utils';
import { PERSIAN_ROLE_NAMES } from '@/lib/shamsi-utils';
import { Role } from '@unify/shared-types';
import { Reply, Mail, MailOpen, Megaphone, MessageSquare, UserCheck, Bell, UserCog } from 'lucide-react';
import { MessageSource } from '@unify/shared-types';
import { SafeText } from '@/lib/sanitize';

// Source icon & color mapping per Golden Doc §2.4.1
const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  [MessageSource.PROFESSOR_BROADCAST]: { icon: <Megaphone className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800', label: 'پیام کلاسی' },
  [MessageSource.PROFESSOR_DIRECT]: { icon: <MessageSquare className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800', label: 'پیام استاد' },
  [MessageSource.EXPERT_TARGETED]: { icon: <UserCheck className="h-3 w-3" />, color: 'bg-purple-100 text-purple-800', label: 'پیام کارشناس' },
  [MessageSource.ADMIN_TARGETED]: { icon: <UserCog className="h-3 w-3" />, color: 'bg-orange-100 text-orange-800', label: 'پیام مدیر' },
  [MessageSource.SYSTEM]: { icon: <Bell className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800', label: 'سیستم' },
  [MessageSource.STUDENT_REPLY]: { icon: <Reply className="h-3 w-3" />, color: 'bg-green-100 text-green-800', label: 'پاسخ' },
};

const DEFAULT_SOURCE = { icon: <Mail className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800', label: 'پیام' };
import { useState } from 'react';

export default function StudentInboxPage() {
  const qc = useQueryClient();
  const { data: threads } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => (await apiClient.get('/inbox')).data.data.threads,
  });

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const reply = useMutation({
    mutationFn: async ({ parentMessageId, content }: { parentMessageId: string; content: string }) =>
      (await apiClient.post('/messages/reply', { parentMessageId, content })).data.data,
    onSuccess: () => {
      toast.success('پاسخ ارسال شد');
      setReplyingTo(null);
      setReplyContent('');
      qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>صندوق ورودی</CardTitle>
          <CardDescription>پیام‌های استادان، کارشناسان و مدیران</CardDescription>
        </CardHeader>
      </Card>

      {(threads || []).map((thread: any) => (
        <Card key={thread.rootMessageId}>
          <CardContent className="p-4 space-y-3">
            {/* Root message */}
            <div className="border-r-4 border-primary pr-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {thread.rootMessage.isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4 text-primary" />}
                  <span className="font-medium">{thread.rootMessage.senderName}</span>
                  <Badge variant="outline">{PERSIAN_ROLE_NAMES[thread.rootMessage.senderRole as Role]}</Badge>
                  {(() => {
                    const cfg = SOURCE_CONFIG[thread.rootMessage.source] || DEFAULT_SOURCE;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xs text-muted-foreground">{thread.latestActivityAt.dateShamsi}</span>
              </div>
              {/* Golden Doc §2.4.3: "Edited [Shamsi Date + Time]" timestamp */}
              {thread.rootMessage.isEdited && thread.rootMessage.editedAt && (
                <p className="text-xs text-muted-foreground mt-1 persian-numerals">
                  ویرایش شده در {thread.rootMessage.editedAt.dateShamsi}
                </p>
              )}
              <p className="mt-2">{thread.rootMessage.content}</p>
              {thread.rootMessage.isEdited && (
                <p className="text-xs text-muted-foreground mt-1">ویرایش شده</p>
              )}
            </div>

            {/* Replies */}
            {thread.replies.map((reply: any) => (
              <div key={reply.id} className="border-r-4 border-muted pr-3 mr-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{reply.senderName}</span>
                  <span className="text-xs text-muted-foreground">{reply.createdAt.dateShamsi}</span>
                </div>
                    <p className="text-sm mt-1"><SafeText text={reply.content} /></p>
              </div>
            ))}

            {/* Reply form */}
            {thread.rootMessage.source !== 'SYSTEM' && (
              <div className="pt-2 border-t">
                {replyingTo === thread.rootMessageId ? (
                  <div className="space-y-2 mt-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="پاسخ شما..."
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>انصراف</Button>
                      <Button
                        size="sm"
                        disabled={!replyContent || reply.isPending}
                        onClick={() => reply.mutate({ parentMessageId: thread.rootMessageId, content: replyContent })}
                      >
                        ارسال پاسخ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(thread.rootMessageId);
                      apiClient.post(`/inbox/${thread.rootMessageId}/read`);
                    }}
                  >
                    <Reply className="h-4 w-4 ml-1" />
                    پاسخ
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {threads?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            پیامی ندارید.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
