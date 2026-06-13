'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
import { toShamsiDateTime, toPersianDigits, toShamsi } from '@/lib/shamsi-utils';
import { Download, FileText, Calendar, ListChecks, GraduationCap, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurriculumTreeView } from '@/components/student/CurriculumTreeView';
import { toShamsiDateTime, toPersianDigits } from '@/lib/shamsi-utils';

export default function StudentUtilitiesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ابزارهای دانشجویی</CardTitle>
          <CardDescription>چارت درسی، فرم‌ها، تقویم، و وظایف شخصی</CardDescription>
        </CardHeader>
      </Card>
      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum"><GraduationCap className="h-4 w-4 ml-1" />چارت درسی</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 ml-1" />فرم‌ها</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 ml-1" />تقویم</TabsTrigger>
          <TabsTrigger value="tracker"><ListChecks className="h-4 w-4 ml-1" />وظایف</TabsTrigger>
        </TabsList>
        <TabsContent value="curriculum"><CurriculumView /></TabsContent>
        <TabsContent value="forms"><FormsView /></TabsContent>
        <TabsContent value="calendar"><CalendarView /></TabsContent>
        <TabsContent value="tracker"><AssignmentTracker /></TabsContent>
      </Tabs>
    </div>
  );
}

function CurriculumView() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/me')).data.data,
  });
  // Golden Doc §2.6.1: Student selects their Major, then their Entry Year
  const { data: departments } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => (await apiClient.get('/departments')).data.data.departments,
  });
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Golden Doc §2.6.1: Default to student's own major, but allow switching
  useEffect(() => {
    if (profile?.department?.id && !selectedDeptId) {
      setSelectedDeptId(profile.department.id);
    }
  }, [profile?.department?.id, selectedDeptId]);

  const deptId = selectedDeptId || profile?.department?.id;
  const { data: passed } = useQuery({
    queryKey: ['passed-courses'],
    queryFn: async () => (await apiClient.get('/curriculum/passed-courses/me')).data.data.passedCourseCodes || [],
  });
  const [selectedYear, setSelectedYear] = useState(1403);
  const { data: chart } = useQuery({
    queryKey: ['curriculum', deptId, selectedYear],
    queryFn: async () => deptId ? (await apiClient.get(`/curriculum/${deptId}/${selectedYear}`)).data.data : null,
    enabled: !!deptId,
  });

  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async (code: string) => {
      const current = passed || [];
      const next = current.includes(code) ? current.filter((c: string) => c !== code) : [...current, code];
      await apiClient.post('/curriculum/passed-courses/me', { courseCodes: next });
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passed-courses'] }),
  });

  const chartData = (chart?.chartData as Array<any>) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-base">رشته (Major)</Label>
            <Select value={selectedDeptId || ''} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-full md:w-96 mt-2">
                <SelectValue placeholder="انتخاب رشته..." />
              </SelectTrigger>
              <SelectContent>
                {(departments || []).map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-base">سال ورودی</Label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-full md:w-48 mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1403, 1402, 1401, 1400].map((y) => (
                  <SelectItem key={y} value={String(y)}>{toPersianDigits(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {chartData.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">چارت درسی برای این سال ورودی موجود نیست.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <CurriculumTreeView
              chartData={chartData}
              passedCodes={passed || []}
              onTogglePassed={(code) => toggle.mutate(code)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormsView() {
  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => (await apiClient.get('/forms')).data.data.forms,
  });
  return (
    <div className="space-y-2">
      {(forms || []).map((f: any) => (
        <Card key={f.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{f.name}</p>
              <p className="text-sm text-muted-foreground">{f.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.signatureGuide}</p>
            </div>
            <Button asChild size="sm">
              <a href={`/api/files/${f.filePath.replace(/^.*\/storage\//, '')}`} target="_blank" rel="noopener">
                <Download className="h-4 w-4 ml-1" />
                دانلود
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
      {forms?.length === 0 && (
        <Card><CardContent className="text-center py-12 text-muted-foreground">فرمی موجود نیست.</CardContent></Card>
      )}
    </div>
  );
}

function CalendarView() {
  const { data: events } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => (await apiClient.get('/calendar')).data.data.events,
  });
  return (
    <div className="space-y-2">
      {(events || []).map((e: any) => (
        <Card key={e.id}>
          <CardContent className="p-3">
            <div className="flex justify-between">
              <p className="font-medium">{e.title}</p>
              <Badge>{e.eventDateShamsi}</Badge>
            </div>
            {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
          </CardContent>
        </Card>
      ))}
      {events?.length === 0 && (
        <Card><CardContent className="text-center py-12 text-muted-foreground">رویدادی در تقویم نیست.</CardContent></Card>
      )}
    </div>
  );
}

function AssignmentTracker() {
  const qc = useQueryClient();
  const { data: tasks } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => (await apiClient.get('/assignments')).data.data.tasks,
  });
  // Golden Doc §2.6.4: fetch enrolled courses for the optional Course field
  const { data: courses } = useQuery({
    queryKey: ['my-enrolled-courses'],
    queryFn: async () => {
      const r = await apiClient.get('/scheduler/search?q=');
      return (r.data.data.courses as Array<any>)
        .filter((c) => c.isAlreadyEnrolledFinal)
        .map((c) => ({ id: c.courseId, code: c.courseCode, name: c.courseName }));
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    taskType: 'ASSIGNMENT',
    courseId: '',
    courseNote: '',
    dueDateShamsi: '',
    reminderEnabled: false,
  });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/assignments', {
      ...form,
      courseId: form.courseId || undefined,
    })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setOpen(false); toast.success('وظیفه اضافه شد'); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/assignments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><ListChecks className="h-4 w-4 ml-1" />وظیفه جدید</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>وظیفه جدید</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
              <div><Label>عنوان</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>نوع</Label>
                <Select value={form.taskType} onValueChange={(v) => setForm({ ...form, taskType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSIGNMENT">تکلیف</SelectItem>
                    <SelectItem value="QUIZ">کوییز</SelectItem>
                    <SelectItem value="OTHER">سایر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>درس (اختیاری)</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="بدون درس - وظیفه عمومی" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون درس</SelectItem>
                    {(courses || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>سررسید (شمسی)</Label><Input required placeholder="۱۴۰۳/۰۶/۱۵" value={form.dueDateShamsi} onChange={(e) => setForm({ ...form, dueDateShamsi: e.target.value })} /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="reminder" checked={form.reminderEnabled} onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })} /><Label htmlFor="reminder">یادآور ۲۴ ساعت قبل</Label></div>
              <Button type="submit" disabled={create.isPending}>ایجاد</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {(tasks || []).map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{t.title}</p>
                {t.course && (
                  <p className="text-xs text-primary mt-1">
                    <span className="font-medium">درس:</span> {t.course.code} - {t.course.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{t.taskType} - سررسید: {t.dueDateShamsi}</p>
                {t.reminderEnabled && <Badge variant="outline" className="mt-1"><Bell className="h-3 w-3 ml-1" />یادآور فعال</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>حذف</Button>
            </CardContent>
          </Card>
        ))}
        {tasks?.length === 0 && (
          <Card><CardContent className="text-center py-12 text-muted-foreground">وظیفه‌ای ندارید.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
