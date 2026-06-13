'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Calendar } from 'lucide-react';

export default function AdminCalendarPage() {
  const qc = useQueryClient();
  const { data: events } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => (await apiClient.get('/calendar')).data.data.events,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', eventDate: '' });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/calendar', form)).data.data,
    onSuccess: () => {
      toast.success('رویداد اضافه شد');
      setOpen(false);
      setForm({ title: '', description: '', eventDate: '' });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/calendar/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('حذف شد');
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <Calendar className="inline h-5 w-5 ml-1" />
              تقویم آموزشی
            </CardTitle>
            <CardDescription>رویدادهای مهم دانشگاه</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />رویداد جدید
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>افزودن رویداد</DialogTitle>
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
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>تاریخ (شمسی)</Label>
                  <Input
                    required
                    placeholder="۱۴۰۳/۰۷/۰۱"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>توضیحات</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <Button type="submit" disabled={create.isPending}>افزودن</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="space-y-2">
        {(events || []).map((e: any) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <h3 className="font-medium">{e.title}</h3>
                <p className="text-sm text-muted-foreground">{e.eventDateShamsi}</p>
                {e.description && <p className="text-sm mt-2">{e.description}</p>}
              </div>
              <div className="flex gap-1">
                <EditEventDialog event={e} onSaved={() => qc.invalidateQueries({ queryKey: ['calendar-events'] })} />
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)} aria-label="حذف رویداد">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events?.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              رویدادی در تقویم نیست.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Golden Doc §3.5.5: Edit event dialog
function EditEventDialog({ event, onSaved }: { event: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: event.title, description: event.description || '', eventDate: event.eventDateShamsi });
  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/calendar/${event.id}`, form),
    onSuccess: () => {
      toast.success('رویداد به‌روزرسانی شد');
      setOpen(false);
      onSaved();
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="ویرایش رویداد">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>ویرایش رویداد تقویم</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate(); }} className="space-y-3">
          <div>
            <Label>عنوان</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>تاریخ (شمسی)</Label>
            <Input required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} placeholder="۱۴۰۳/۰۷/۰۱" />
          </div>
          <div>
            <Label>توضیحات</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button type="submit" disabled={update.isPending}>ذخیره</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
