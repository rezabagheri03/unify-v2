'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, FileText, Eye } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function ProfessorFilesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['professor-files'],
    queryFn: async () => (await apiClient.get('/professor/files')).data.data,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const files = data?.files || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>فایل‌های من</CardTitle>
          <CardDescription>
            بازخورد دانشجویان درباره فایل‌های بارگذاری شده توسط شما
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-2">
        {files.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-8 w-8 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {f.courseCode} - {f.courseName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      نسخه {toPersianDigits(f.versionNumber)} - بارگذاری: {f.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium persian-numerals">
                      {toPersianDigits(f.averageRating.toFixed(1))}
                    </span>
                    <span className="text-xs text-muted-foreground persian-numerals">
                      ({toPersianDigits(f.ratingCount)} رأی)
                    </span>
                  </div>
                  {f.badgeType && (
                    <Badge variant={f.badgeType === 'PROFESSOR_BADGE' ? 'default' : 'secondary'}>
                      {f.badgeType === 'PROFESSOR_BADGE' ? 'استاد' : 'تأیید شده'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {files.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              هنوز فایلی بارگذاری نکرده‌اید.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
