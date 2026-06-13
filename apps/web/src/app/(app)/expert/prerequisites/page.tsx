'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function ExpertPrerequisitesPage() {
  const qc = useQueryClient();
  const { data: courses } = useQuery({
    queryKey: ['expert-courses'],
    queryFn: async () => (await apiClient.get('/expert/courses')).data.data.courses,
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    if (!selectedCourseId && courses && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const { data: prereqs } = useQuery({
    queryKey: ['prereqs', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const r = await apiClient.get(`/expert/courses/${selectedCourseId}/prerequisites`);
      return r.data.data.prerequisites || [];
    },
    enabled: !!selectedCourseId,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'prerequisite', otherCourseId: '' });

  const add = useMutation({
    mutationFn: async () => {
      const url = form.type === 'prerequisite'
        ? `/expert/courses/${selectedCourseId}/prerequisites`
        : `/expert/courses/${selectedCourseId}/corequisites`;
      await apiClient.post(url, {
        [form.type === 'prerequisite' ? 'prerequisiteId' : 'courseBId']: form.otherCourseId,
      });
    },
    onSuccess: () => {
      toast.success('اضافه شد');
      setOpen(false);
      setForm({ type: 'prerequisite', otherCourseId: '' });
      qc.invalidateQueries({ queryKey: ['prereqs', selectedCourseId] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const url = form.type === 'prerequisite'
        ? `/expert/courses/${selectedCourseId}/prerequisites/${id}`
        : `/expert/courses/${selectedCourseId}/corequisites/${id}`;
      await apiClient.delete(url);
    },
    onSuccess: () => {
      toast.success('حذف شد');
      qc.invalidateQueries({ queryKey: ['prereqs', selectedCourseId] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Link2 className="inline h-5 w-5 ml-1" />
            مدیریت پیش‌نیاز و هم‌نیاز
          </CardTitle>
          <CardDescription>
            برای هر درس، پیش‌نیازها و هم‌نیازهای آن را تعریف کنید. دانشجویان هنگام ثبت‌نام هشدار می‌بینند.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب درس..." />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourseId && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-1" />افزودن رابطه
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>افزودن رابطه جدید</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>نوع رابطه</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prerequisite">پیش‌نیاز</SelectItem>
                          <SelectItem value="corequisite">هم‌نیاز</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>درس مرتبط</Label>
                      <Select value={form.otherCourseId} onValueChange={(v) => setForm({ ...form, otherCourseId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب درس..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses
                            ?.filter((c: any) => c.id !== selectedCourseId)
                            .map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.code} - {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={!form.otherCourseId || add.isPending}>
                      افزودن
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="space-y-2">
            {(prereqs || []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{p.courseName}</p>
                  <p className="text-xs text-muted-foreground">{p.courseCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{p.type === 'prerequisite' ? 'پیش‌نیاز' : 'هم‌نیاز'}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {selectedCourseId && (prereqs || []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                رابطه‌ای تعریف نشده است.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
