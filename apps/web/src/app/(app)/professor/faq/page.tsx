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
import { Plus, Trash2, HelpCircle, Pencil } from 'lucide-react';

export default function ProfessorFAQPage() {
  const qc = useQueryClient();
  const { data: specs } = useQuery({
    queryKey: ['professor-specs'],
    queryFn: async () => (await apiClient.get('/professor/specifications')).data.data.specifications,
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '' });

  const { data: faqs } = useQuery({
    queryKey: ['faqs', selectedCourseId],
    queryFn: async () =>
      selectedCourseId
        ? (await apiClient.get(`/faq/${selectedCourseId}`)).data.data.faqs
        : [],
    enabled: !!selectedCourseId,
  });

  const create = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/faq', { courseId: selectedCourseId, ...form })).data.data,
    onSuccess: () => {
      toast.success('سؤال متداول اضافه شد');
      setOpen(false);
      setForm({ question: '', answer: '' });
      qc.invalidateQueries({ queryKey: ['faqs', selectedCourseId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/faq/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faqs', selectedCourseId] });
      toast.success('حذف شد');
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <HelpCircle className="inline h-5 w-5 ml-1" />
            سؤالات متداول
          </CardTitle>
          <CardDescription>پرسش و پاسخ‌های پرتکرار برای هر درس</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <Plus className="h-4 w-4 ml-1" />سؤال جدید
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>افزودن سؤال متداول</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      create.mutate();
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>سؤال</Label>
                      <Input
                        required
                        value={form.question}
                        onChange={(e) => setForm({ ...form, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>پاسخ</Label>
                      <Textarea
                        required
                        rows={4}
                        value={form.answer}
                        onChange={(e) => setForm({ ...form, answer: e.target.value })}
                      />
                    </div>
                    <Button type="submit" disabled={create.isPending}>
                      افزودن
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(faqs || []).map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{f.question}</p>
                  <p className="text-sm text-muted-foreground mt-1">{f.answer}</p>
                </div>
                <div className="flex gap-1">
                  <EditFaqDialog faq={f} onSaved={() => qc.invalidateQueries({ queryKey: ['faqs', selectedCourseId] })} />
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)} aria-label="حذف سؤال">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {selectedCourseId && faqs?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              سؤالی برای این درس ثبت نشده است.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Golden Doc §3.2.6: Edit FAQ dialog
function EditFaqDialog({ faq, onSaved }: { faq: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: faq.question, answer: faq.answer });
  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/faq/${faq.id}`, form),
    onSuccess: () => {
      toast.success('سؤال به‌روزرسانی شد');
      setOpen(false);
      onSaved();
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="ویرایش سؤال">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>ویرایش سؤال</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate(); }} className="space-y-3">
          <div>
            <Label>سؤال</Label>
            <Input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </div>
          <div>
            <Label>پاسخ</Label>
            <Textarea required rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </div>
          <Button type="submit" disabled={update.isPending}>ذخیره</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
