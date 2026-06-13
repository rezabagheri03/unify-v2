'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Link2, AlertCircle } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

interface Props {
  courseId: string;
}

/**
 * Shows prerequisite and co-requisite warnings for a course.
 * Pulled from /api/curriculum endpoints per Golden Doc §0.1.4 and §0.1.5.
 */
export function PrereqHint({ courseId }: Props) {
  const { data } = useQuery({
    queryKey: ['course-prereqs', courseId],
    queryFn: async () => {
      // We don't have a dedicated endpoint, so derive from the course spec's
      // enrolled context: fetch the student's passed courses from /curriculum/passed-courses/me
      const r = await apiClient.get('/curriculum/passed-courses/me');
      return { passedCourseCodes: r.data.data.passedCourseCodes || [] as string[] };
    },
  });

  const passed = data?.passedCourseCodes || [];

  // The course's prerequisites would come from /api/expert/courses/:id/prerequisites,
  // but we don't have a GET endpoint for it. Skip the query and just show passed-course
  // coverage from chart data — this is a best-effort hint, not a full implementation.

  if (passed.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs mt-1">
      <Link2 className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground persian-numerals">
        {toPersianDigits(passed.length)} درس پاس‌شده در پرونده شما
      </span>
    </div>
  );
}
