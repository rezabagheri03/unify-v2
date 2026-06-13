'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { Day, PERSIAN_DAY_NAMES } from '@unify/shared-types';

export default function ExpertSpecificationsPage() {
  const qc = useQueryClient();
  const { data: specs } = useQuery({
    queryKey: ['expert-specs'],
    queryFn: async () => {
      const courses = (await apiClient.get('/expert/courses')).data.data.courses;
      const semester = await (await apiClient.get('/system/state')).data.data;
      return { courses, semester };
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    professorId: '',
    classDays: [] as string[],
    classStartTime: '08:00',
    classEndTime: '10:00',
    classroomLocation: '',
    finalExamDate: '',
    finalExamTime: '',
    finalExamLocation: '',
  });

  // Fetch all professors for the dropdown (admin-like)
  const { data: profs } = useQuery({
    queryKey: ['all-professors'],
    queryFn: async () => (await apiClient.get('/admin/users?role=PROFESSOR')).data.data.users,
  });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/expert/specifications', form)).data.data,
    onSuccess: () => {
      toast.success('گروه درسی ایجاد شد');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['expert-specs'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <Calendar className="inline h-5 w-5 ml-1" />
              گروه‌های درسی
            </CardTitle>
            <CardDescription>مدیریت زمان‌بندی، استاد و مکان دروس</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />گروه جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>ایجاد گروه درسی</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>درس</Label>
                    <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب..." />
                      </SelectTrigger>
                      <SelectContent>
                        {specs?.data?.courses?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>استاد</Label>
                    <Select value={form.professorId} onValueChange={(v) => setForm({ ...form, professorId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profs?.users?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {[p.firstName, p.lastName].filter(Boolean).join(' ') || p.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>روزهای کلاس</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.values(Day).map((d) => (
                      <label key={d} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={form.classDays.includes(d)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              classDays: e.target.checked
                                ? [...form.classDays, d]
                                : form.classDays.filter((x) => x !== d),
                            })
                          }
                        />
                        <span>{PERSIAN_DAY_NAMES[d]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ساعت شروع</Label>
                    <Input
                      type="time"
                      value={form.classStartTime}
                      onChange={(e) => setForm({ ...form, classStartTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>ساعت پایان</Label>
                    <Input
                      type="time"
                      value={form.classEndTime}
                      onChange={(e) => setForm({ ...form, classEndTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>مکان کلاس</Label>
                  <Input
                    value={form.classroomLocation}
                    onChange={(e) => setForm({ ...form, classroomLocation: e.target.value })}
                    placeholder="مثال: ساختمان A، کلاس ۲۰۴"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>تاریخ امتحان پایان‌ترم (شمسی)</Label>
                    <Input
                      placeholder="۱۴۰۳/۰۹/۱۵"
                      value={form.finalExamDate}
                      onChange={(e) => setForm({ ...form, finalExamDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>ساعت امتحان</Label>
                    <Input
                      type="time"
                      value={form.finalExamTime}
                      onChange={(e) => setForm({ ...form, finalExamTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>مکان امتحان</Label>
                    <Input
                      value={form.finalExamLocation}
                      onChange={(e) => setForm({ ...form, finalExamLocation: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={create.isPending || !form.courseId || !form.professorId}>
                  ایجاد
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            برای مشاهده لیست کامل، به داشبورد بروید. در این صفحه فقط می‌توانید گروه‌های جدید ایجاد کنید.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
