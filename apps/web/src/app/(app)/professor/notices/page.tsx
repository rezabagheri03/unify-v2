'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toShamsiDateTime } from '@/lib/shamsi-utils';

export default function ProfessorNoticesPage() {
  const qc = useQueryClient();
  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data: notices } = useQuery({
    queryKey: ['notices', selectedCourseId],
    queryFn: async () =>
      selectedCourseId
        ? (await apiClient.get(`/notices/${selectedCourseId}`)).data.data.notices
        : [],
    enabled: !!selectedCourseId,
  });

  const create = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/notices', {
        courseId: selectedCourseId,
        ...form,
      })).data.data,
    onSuccess: () => {
      toast.success('اطلاعیه ایجاد شد');
      setOpen(false);
      setForm({ title: '', content: '' });
      qc.invalidateQueries({ queryKey: ['notices', selectedCourseId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/notices/${id}`),
    onSuccess: () => {
      toast.success('حذف شد');
      qc.invalidateQueries({ queryKey: ['notices', selectedCourseId] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>تابلو اعلانات</CardTitle>
          <CardDescription>اطلاعیه‌های شما برای دانشجویان هر درس</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب درس..." />
              </SelectTrigger>
              <SelectContent>
                {specs?.map((s: any) => (
                  <SelectItem key={s.course.id} value={s.course.id}>
                    {s.course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourseId && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-1" />اطلاعیه جدید
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>اطلاعیه جدید</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      create.mutate();
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>عنوان</Label>
                      <Input
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>متن</Label>
                      <Textarea
                        required
                        rows={5}
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                      />
                    </div>
                    <Button type="submit" disabled={create.isPending}>
                      ایجاد
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(notices || []).map((n: any) => (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{n.title}</h3>
                  <p className="text-sm mt-1">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{n.createdAt}</p>
                </div>
                <div className="flex gap-1">
                  <EditNoticeDialog notice={n} onSaved={() => qc.invalidateQueries({ queryKey: ['student-notices', selectedCourseId] })} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(n.id)}
                    aria-label="حذف اطلاعیه"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {selectedCourseId && notices?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              اطلاعیه‌ای برای این درس ثبت نشده است.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Golden Doc §3.2.6: Edit notice dialog
function EditNoticeDialog({ notice, onSaved }: { notice: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: notice.title, content: notice.content });
  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/notices/${notice.id}`, form),
    onSuccess: () => {
      toast.success('اطلاعیه به‌روزرسانی شد');
      setOpen(false);
      onSaved();
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="ویرایش اطلاعیه">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>ویرایش اطلاعیه</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate(); }} className="space-y-3">
          <div>
            <Label>عنوان</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>متن</Label>
            <Textarea required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <Button type="submit" disabled={update.isPending}>ذخیره</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
