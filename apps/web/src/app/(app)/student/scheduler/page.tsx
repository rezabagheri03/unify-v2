'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERSIAN_DAY_NAMES, PERSIAN_PHASE_NAMES, PERSIAN_STATUS_NAMES, toPersianDigits } from '@/lib/shamsi-utils';
import { Phase, AcademicStatus, Day } from '@unify/shared-types';
import { Search, Plus, Sparkles, Calendar, AlertTriangle, Archive, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ExamScheduleFlip } from '@/components/student/ExamScheduleFlip';
import { FinalSemesterDialog } from '@/components/student/FinalSemesterDialog';
import { PhaseGate } from '@/components/shared/PhaseGate';

export default function SchedulerPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AcademicStatus>(AcademicStatus.NORMAL);
  const [pendingStatus, setPendingStatus] = useState<AcademicStatus | null>(null);
  const [finalSemesterDialogOpen, setFinalSemesterDialogOpen] = useState(false);
  const [archiveSemesterId, setArchiveSemesterId] = useState<string | null>(null);

  const { data: state } = useQuery({
    queryKey: ['scheduler-state'],
    queryFn: async () => (await apiClient.get('/scheduler/state')).data.data,
  });

  const { data: allSemesters } = useQuery({
    queryKey: ['semesters-list'],
    queryFn: async () => (await apiClient.get('/system/state')).data.data,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['search', search, archiveSemesterId],
    queryFn: async () => {
      const url = archiveSemesterId
        ? `/scheduler/search?q=${encodeURIComponent(search)}&semesterId=${archiveSemesterId}`
        : `/scheduler/search?q=${encodeURIComponent(search)}`;
      const res = await apiClient.get(url);
      return res.data.data.courses;
    },
    enabled: !!archiveSemesterId || !archiveSemesterId,
  });

  const { data: tempList } = useQuery({
    queryKey: ['temp-list'],
    queryFn: async () => {
      const r = await apiClient.get('/scheduler/search?q=');
      return (r.data.data.courses as Array<any>).filter((c) => c.isAlreadyAdded);
    },
  });

  const { data: golden } = useQuery({
    queryKey: ['golden-schedule', selectedStatus],
    queryFn: async () => {
      const courses = (await apiClient.get('/scheduler/search?q=')).data.data.courses as Array<{ courseId: string }>;
      if (courses.length === 0) return null;
      return (
        await apiClient.post('/scheduler/golden-schedule', {
          remainingCourseIds: courses.slice(0, 8).map((c) => c.courseId),
          academicStatus: selectedStatus,
        })
      ).data.data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => (await apiClient.post('/scheduler/submit')).data.data,
    onSuccess: (data) => {
      toast.success('ثبت‌نام نهایی شد', `${data.enrolledCount} درس ثبت شد`);
      qc.invalidateQueries({ queryKey: ['temp-list'] });
      qc.invalidateQueries({ queryKey: ['scheduler-state'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const phase = state?.phase || Phase.ENROLLMENT;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>برنامه‌ریز درسی</CardTitle>
              <CardDescription>
                فاز فعلی: {PERSIAN_PHASE_NAMES[phase as Phase]} - وضعیت تحصیلی:{' '}
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => {
                    const next = v as AcademicStatus;
                    if (next === AcademicStatus.FINAL_SEMESTER && selectedStatus !== AcademicStatus.FINAL_SEMESTER) {
                      // Show confirmation dialog before applying
                      setPendingStatus(next);
                      setFinalSemesterDialogOpen(true);
                    } else {
                      setSelectedStatus(next);
                      // Persist the academic status to supplementaryInfo via the profile endpoint
                      apiClient.patch('/users/me', { supplementaryInfo: `ACADEMIC_STATUS:${next}` }).catch(() => {});
                    }
                  }}
                >
                  <SelectTrigger className="inline-flex w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AcademicStatus) as AcademicStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {PERSIAN_STATUS_NAMES[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardDescription>
            </div>
            <ArchiveDropdown archiveSemesterId={archiveSemesterId} setArchiveSemesterId={setArchiveSemesterId} />
          </div>
        </CardHeader>
      </Card>

      {archiveSemesterId && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <Archive className="h-4 w-4" />
            <span>در حال مشاهده آرشیو - فقط خواندنی. برای بازگشت، "نیم‌سال جاری" را انتخاب کنید.</span>
          </CardContent>
        </Card>
      )}

      {/* Final Semester confirmation dialog (Golden Doc §2.2.1) */}
      <FinalSemesterDialog
        open={finalSemesterDialogOpen}
        onOpenChange={setFinalSemesterDialogOpen}
        pendingValue={pendingStatus || AcademicStatus.NORMAL}
        onConfirm={() => {
          if (pendingStatus) {
            setSelectedStatus(pendingStatus);
            apiClient
              .patch('/users/me', { supplementaryInfo: `ACADEMIC_STATUS:${pendingStatus}` })
              .catch(() => {});
          }
        }}
      />

      {phase === Phase.ENROLLMENT && !archiveSemesterId && (
        <>
          <Tabs defaultValue="search">
            <TabsList>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 ml-1" />جستجو
              </TabsTrigger>
              <TabsTrigger value="golden">
                <Sparkles className="h-4 w-4 ml-1" />برنامه طلایی
              </TabsTrigger>
              <TabsTrigger value="temp">
                <CheckCircle className="h-4 w-4 ml-1" />لیست موقت ({tempList?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <Input
                    placeholder="جستجو بر اساس نام یا کد درس..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </CardContent>
              </Card>

              {searchResults ? (
                <div className="space-y-2">
                  {searchResults.map((s: any) => (
                    <Card key={s.specificationId}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <h3 className="font-medium">{s.courseName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {s.courseCode} - {toPersianDigits(s.credits)} واحد - استاد: {s.professorName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(s.classDays as Day[]).map((d) => PERSIAN_DAY_NAMES[d]).join('، ')} -{' '}
                            {toPersianDigits(s.classStartTime)} تا {toPersianDigits(s.classEndTime)} -{' '}
                            {s.classroomLocation}
                          </p>
                        </div>
                        <div>
                          {s.isAlreadyAdded ? (
                            <Badge variant="secondary">در لیست موقت</Badge>
                          ) : s.isAlreadyEnrolledFinal ? (
                            <Badge>قطعی</Badge>
                          ) : (
                            <AddButton specificationId={s.specificationId} searchQueryKey={['search', search, null]} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Skeleton className="h-32 w-full" />
              )}
            </TabsContent>

            <TabsContent value="golden">
              <Card>
                <CardHeader>
                  <CardTitle>برنامه طلایی</CardTitle>
                  <CardDescription>ترکیب‌های بدون تعارض پیشنهادی توسط سیستم</CardDescription>
                </CardHeader>
                <CardContent>
                  {golden?.combinations?.length > 0 ? (
                    <div className="space-y-3">
                      {golden.combinations.map((combo: any, idx: number) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm text-muted-foreground">ترکیب {toPersianDigits(idx + 1)}</p>
                                <p className="font-medium">جمع واحد: {toPersianDigits(combo.totalCredits)}</p>
                                <p className="text-xs">امتیاز فشردگی: {toPersianDigits(Math.round(combo.compactnessScore))}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  for (const spec of combo.specifications) {
                                    await apiClient.post('/scheduler/temp-add', {
                                      specificationId: spec.specificationId,
                                      confirmConflict: true,
                                    });
                                  }
                                  qc.invalidateQueries({ queryKey: ['search'] });
                                  qc.invalidateQueries({ queryKey: ['temp-list'] });
                                  toast.success('برنامه طلایی اعمال شد');
                                }}
                              >
                                <Plus className="h-4 w-4 ml-1" />
                                اعمال این ترکیب
                              </Button>
                            </div>
                            <ul className="mt-2 text-sm list-disc list-inside">
                              {combo.specifications.map((s: any) => (
                                <li key={s.specificationId}>
                                  {s.courseName} - {toPersianDigits(s.credits)} واحد
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      ترکیب بدون تعارض یافت نشد. لطفاً دروس را به‌صورت دستی انتخاب کنید.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="temp">
              <Card>
                <CardHeader>
                  <CardTitle>لیست موقت شما</CardTitle>
                  <CardDescription>
                    پس از بررسی، روی «ثبت نهایی» کلیک کنید تا لیست شما قطعی شود.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(tempList || []).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">لیست موقت شما خالی است.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {tempList?.map((c: any) => (
                          <div key={c.specificationId} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="font-medium">{c.courseName}</p>
                              <p className="text-sm text-muted-foreground">
                                {c.courseCode} - {toPersianDigits(c.credits)} واحد
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await apiClient.delete(`/scheduler/temp-remove/${c.specificationId}`);
                                qc.invalidateQueries({ queryKey: ['temp-list'] });
                              }}
                            >
                              حذف
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between font-medium">
                          <span>جمع واحدها:</span>
                          <span className="persian-numerals">
                            {toPersianDigits(
                              tempList?.reduce((sum: number, c: any) => sum + c.credits, 0) || 0,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>حداکثر مجاز ({PERSIAN_STATUS_NAMES[selectedStatus]}):</span>
                          <span className="persian-numerals">
                            {toPersianDigits(
                              selectedStatus === AcademicStatus.FINAL_SEMESTER
                                ? 24
                                : selectedStatus === AcademicStatus.GPA_A
                                ? 24
                                : selectedStatus === AcademicStatus.CONDITIONAL
                                ? 14
                                : 20,
                            )}
                          </span>
                        </div>
                        <SubmitFinalButton
                          disabled={submit.isPending || !tempList?.length}
                          onSubmit={() => submit.mutate()}
                          tempCount={tempList?.length || 0}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {phase === Phase.ACTIVE && <ActiveViewWithFlip />}
      {phase === Phase.EXAM && <ActiveViewWithFlip />}
    </div>
  );
}

function SubmitFinalButton({ disabled, onSubmit, tempCount }: { disabled: boolean; onSubmit: () => void; tempCount: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setConfirmOpen(true)} disabled={disabled} className="w-full" size="lg">
        <CheckCircle className="h-5 w-5 ml-2" />
        ثبت نهایی ({toPersianDigits(tempCount)} درس)
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید ثبت نهایی</DialogTitle>
            <DialogDescription>
              پس از ثبت نهایی، امکان تغییر لیست وجود ندارد مگر اینکه مدیر سیستم فصل ثبت‌نام را مجدداً باز کند.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={() => {
                onSubmit();
                setConfirmOpen(false);
              }}
            >
              بله، ثبت نهایی شود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ArchiveDropdown({
  archiveSemesterId,
  setArchiveSemesterId,
}: {
  archiveSemesterId: string | null;
  setArchiveSemesterId: (id: string | null) => void;
}) {
  // Use admin endpoint to list semesters
  const { data: semesters } = useQuery({
    queryKey: ['all-semesters'],
    queryFn: async () => (await apiClient.get('/admin/semesters')).data.data.semesters,
    retry: false,
  });

  return (
    <div className="flex items-center gap-2">
      <Archive className="h-4 w-4 text-muted-foreground" />
      <Select
        value={archiveSemesterId || 'current'}
        onValueChange={(v) => setArchiveSemesterId(v === 'current' ? null : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">نیم‌سال جاری</SelectItem>
          {(semesters?.semesters || []).map((s: any) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} {!s.isCurrent && '(آرشیو)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AddButton({ specificationId, searchQueryKey }: { specificationId: string; searchQueryKey: any[] }) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const add = useMutation({
    mutationFn: async (confirm: boolean) =>
      (await apiClient.post('/scheduler/temp-add', { specificationId, confirmConflict: confirm })).data.data,
    onSuccess: (data) => {
      if (!data.success && data.warnings.length > 0) {
        setWarnings(data.warnings);
        setConfirmOpen(true);
      } else {
        toast.success('به لیست موقت اضافه شد');
        qc.invalidateQueries({ queryKey: searchQueryKey });
        qc.invalidateQueries({ queryKey: ['temp-list'] });
      }
    },
    onError: (err: any) => {
      toast.error('خطا', err?.response?.data?.error?.message);
    },
  });

  return (
    <>
      <Button size="sm" onClick={() => add.mutate(false)} disabled={add.isPending}>
        <Plus className="h-4 w-4 ml-1" />
        افزودن
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید افزودن</DialogTitle>
            <DialogDescription>
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1" />
                  <span>{w}</span>
                </div>
              ))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={() => {
                add.mutate(true);
                setConfirmOpen(false);
              }}
            >
              تأیید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActiveViewWithFlip() {
  const { data: enrollments } = useQuery({
    queryKey: ['active-enrollments'],
    queryFn: async () => (await apiClient.get('/scheduler/search?q=')).data.data.courses,
  });
  const { data: exams } = useQuery({
    queryKey: ['exam-schedule'],
    queryFn: async () => (await apiClient.get('/scheduler/exam-schedule')).data.data.exams,
  });

  const finals = (enrollments || []).filter((c: any) => c.isAlreadyEnrolledFinal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>برنامه هفتگی / امتحانات</CardTitle>
        <CardDescription>
          روی دکمه زیر کلیک کنید تا کارت بچرخد و برنامه امتحانات نمایش داده شود.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExamScheduleFlip enrollments={finals} exams={exams || []} />
      </CardContent>
    </Card>
  );
}
