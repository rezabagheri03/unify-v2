'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { PERSIAN_DAY_NAMES, PERSIAN_PHASE_NAMES, PERSIAN_STATUS_NAMES, toPersianDigits, PERSIAN_ROLE_NAMES } from '@/lib/shamsi-utils';
import { Phase, AcademicStatus, Day, Role } from '@unify/shared-types';
import { Download, MessageCircle, Info, Archive, Calendar, CheckCircle } from 'lucide-react';
import { CourseDetailsModal } from '@/components/student/CourseDetailsModal';
import { CardColorPicker } from '@/components/student/CardColorPicker';
import { CriticalAlertBanner } from '@/components/student/CriticalAlertBanner';
import { CancelledNoticeBanner } from '@/components/student/CancelledNoticeBanner';
import { ArchiveDropdown } from '@/components/student/ArchiveDropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

export default function StudentDashboard() {
  const qc = useQueryClient();
  const [cardColors, setCardColors] = useState<Record<string, string>>({});
  const [archiveSemesterId, setArchiveSemesterId] = useState<string | null>(null);

  // Load saved colors from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('unify-card-colors');
    if (saved) setCardColors(JSON.parse(saved));
  }, []);

  const updateColor = (specId: string, color: string) => {
    const next = { ...cardColors, [specId]: color };
    setCardColors(next);
    localStorage.setItem('unify-card-colors', JSON.stringify(next));
  };

  const { data: state, isLoading: stateLoading } = useQuery({
    queryKey: ['scheduler-state'],
    queryFn: async () => (await apiClient.get('/scheduler/state')).data.data,
  });

  const { data: finalEnrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['final-enrollments', archiveSemesterId],
    queryFn: async () => {
      // Golden Doc §2.1.1: archive view pulls past-semester enrollments
      const url = archiveSemesterId
        ? `/scheduler/search?q=&semesterId=${archiveSemesterId}`
        : '/scheduler/search?q=';
      const r = await apiClient.get(url);
      return (r.data.data.courses as Array<any>).filter(
        (c) => c.isAlreadyEnrolledFinal || archiveSemesterId, // archive shows everything
      );
    },
  });

  const isSubmitted = (state?.currentEnrollments || 0) > 0;
  const isArchive = archiveSemesterId !== null;

  // Fetch telegram links for all enrolled specs
  const { data: specsDetail } = useQuery({
    queryKey: ['specs-detail', finalEnrollments],
    queryFn: async () => {
      if (!finalEnrollments) return {};
      const result: Record<string, any> = {};
      await Promise.all(
        finalEnrollments.slice(0, 10).map(async (c: any) => {
          try {
            const r = await apiClient.get(`/syllabus/specification/${c.specificationId}`);
            result[c.specificationId] = r.data.data.specification;
          } catch {
            /* ignore */
          }
        }),
      );
      return result;
    },
    enabled: !!finalEnrollments,
  });

  if (stateLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const phase = state?.phase || Phase.ENROLLMENT;

  return (
    <div className="space-y-6">
      {/* Critical alert banner (Golden Doc §2.1.3) */}
      <CriticalAlertBanner />

      {/* Cancelled-spec notices (Agent Guide Decision 5) */}
      <CancelledNoticeBanner />

      {/* Status banner with Archive Dropdown */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <CardTitle>وضعیت فعلی</CardTitle>
              <CardDescription>
                {state?.semesterName} - فاز:{' '}
                <span className="font-medium">{PERSIAN_PHASE_NAMES[phase as Phase]}</span>
                {isArchive && (
                  <Badge variant="outline" className="mr-2 border-yellow-500 text-yellow-700">
                    <Archive className="h-3 w-3 ml-1" />
                    حالت آرشیو - فقط خواندنی
                  </Badge>
                )}
              </CardDescription>
            </div>
            <ArchiveDropdown value={archiveSemesterId} onChange={setArchiveSemesterId} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">واحدهای ثبت‌نام شده</p>
              <p className="text-2xl font-bold persian-numerals">
                {toPersianDigits(state?.totalCredits || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">حداکثر واحد</p>
              <p className="text-2xl font-bold persian-numerals">
                {toPersianDigits(state?.maxCredits || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">تعداد دروس</p>
              <p className="text-2xl font-bold persian-numerals">
                {toPersianDigits(state?.currentEnrollments || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">وضعیت تحصیلی</p>
              <p className="text-base font-medium">
                {PERSIAN_STATUS_NAMES[(state?.academicStatus as AcademicStatus) || AcademicStatus.NORMAL]}
              </p>
            </div>
          </div>
          {!isArchive && phase === Phase.ENROLLMENT && (
            <div className="flex gap-2 mt-4 flex-wrap items-center">
              {!isSubmitted && (
                <Button asChild>
                  <Link href="/student/scheduler">مدیریت ثبت‌نام</Link>
                </Button>
              )}
              {isSubmitted && (
                <>
                  <Button asChild variant="outline">
                    <Link href="/student/scheduler">مشاهده برنامه</Link>
                  </Button>
                  <span className="text-xs text-green-700 persian-numerals flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    ثبت‌نام نهایی شده
                  </span>
                </>
              )}
            </div>
          )}
          {!isArchive && phase === Phase.EXAM && (
            <Button asChild className="mt-4">
              <Link href="/student/scheduler">مشاهده برنامه امتحانات</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Course cards */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isArchive ? 'دروس نیم‌سال آرشیو' : 'دروس ترم جاری'}
        </h2>
        {enrollmentsLoading || !finalEnrollments ? (
          <Skeleton className="h-32 w-full" />
        ) : finalEnrollments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              {isArchive ? 'درسی در این نیم‌سال آرشیو ثبت نشده است.' :
                phase === Phase.ENROLLMENT ? 'هنوز درسی انتخاب نکرده‌اید.' : 'درسی برای نمایش وجود ندارد.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finalEnrollments.map((c) => {
              const color = cardColors[c.specificationId] || '#6366f1';
              const detail = specsDetail?.[c.specificationId];
              return (
                <Card key={c.specificationId} className="overflow-hidden">
                  <div className="h-3" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{c.courseName}</CardTitle>
                          {isArchive ? (
                            <Badge variant="secondary" className="text-xs">
                              <Archive className="h-3 w-3 ml-1" />
                              آرشیو
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              ثبت‌نام قطعی
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {c.courseCode} - {toPersianDigits(c.credits)} واحد
                        </CardDescription>
                      </div>
                      {!isArchive && (
                        <CardColorPicker
                          enrollmentId={c.specificationId}
                          currentColor={color}
                          onChange={(c2) => updateColor(c.specificationId, c2)}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">استاد: </span>
                      <span>{c.professorName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">زمان: </span>
                      <span>
                        {(c.classDays as Day[]).map((d) => PERSIAN_DAY_NAMES[d]).join('، ')} -{' '}
                        {toPersianDigits(c.classStartTime)} تا {toPersianDigits(c.classEndTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">مکان: </span>
                      <span>{c.classroomLocation}</span>
                    </div>
                    {c.finalExamDate?.dateShamsi && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-xs">
                        <Calendar className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-700">
                          <span className="font-medium">امتحان پایان‌ترم: </span>
                          <span className="persian-numerals">{c.finalExamDate.dateShamsi}</span>
                          {c.finalExamTime && (
                            <>
                              {' '}ساعت <span className="persian-numerals">{toPersianDigits(c.finalExamTime)}</span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 flex-wrap">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/student/resources?courseId=${c.courseId}&professorId=${c.professorId}`}>
                          <Download className="h-4 w-4 ml-1" />
                          منابع
                        </Link>
                      </Button>
                      {detail?.telegramLink && !isArchive && (
                        <Button asChild size="sm" variant="outline">
                          <a href={detail.telegramLink} target="_blank" rel="noopener">
                            <MessageCircle className="h-4 w-4 ml-1" />
                            گروه
                          </a>
                        </Button>
                      )}
                      <CourseDetailsModal
                        specificationId={c.specificationId}
                        telegramLink={detail?.telegramLink}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
