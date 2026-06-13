'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { toPersianDigits, toShamsiDateTime } from '@/lib/shamsi-utils';

export default function HeadProfessorsPage() {
  const { data: professors } = useQuery({
    queryKey: ['head-professors'],
    queryFn: async () => (await apiClient.get('/head/professors')).data.data.professors,
  });

  const inactive = (professors || []).filter((p: any) => p.uploadedFilesCount === 0);
  const active = (professors || []).filter((p: any) => p.uploadedFilesCount > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Users className="inline h-5 w-5 ml-1" />
            نظارت بر اساتید گروه
          </CardTitle>
          <CardDescription>
            شناسایی اساتیدی که هنوز منبعی بارگذاری نکرده‌اند
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-muted rounded">
              <p className="text-sm text-muted-foreground">کل اساتید</p>
              <p className="text-2xl font-bold persian-numerals">
                {toPersianDigits((professors || []).length)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <p className="text-sm text-green-700">فعال</p>
              <p className="text-2xl font-bold text-green-900 persian-numerals">
                {toPersianDigits(active.length)}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <p className="text-sm text-yellow-700">بدون بارگذاری</p>
              <p className="text-2xl font-bold text-yellow-900 persian-numerals">
                {toPersianDigits(inactive.length)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              اساتید بدون منبع ({toPersianDigits(inactive.length)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>شناسه پرسنلی</TableHead>
                  <TableHead>تعداد گروه‌ها</TableHead>
                  <TableHead>آخرین بارگذاری</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactive.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="persian-numerals">{p.personnelId}</TableCell>
                    <TableCell className="persian-numerals">{toPersianDigits(p.specificationsCount)}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            اساتید فعال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>تعداد گروه</TableHead>
                <TableHead>تعداد فایل</TableHead>
                <TableHead>آخرین بارگذاری</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="persian-numerals">{toPersianDigits(p.specificationsCount)}</TableCell>
                  <TableCell className="persian-numerals">{toPersianDigits(p.uploadedFilesCount)}</TableCell>
                  <TableCell className="text-xs persian-numerals">
                    {p.lastUploadAt ? new Date(p.lastUploadAt).toLocaleDateString('fa-IR') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
