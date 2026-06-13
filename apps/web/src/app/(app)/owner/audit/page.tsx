'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, FileText } from 'lucide-react';
import { PERSIAN_ROLE_NAMES, toPersianDigits } from '@/lib/shamsi-utils';
import { Role, AuditActionType } from '@unify/shared-types';

const PERSIAN_ACTION_LABELS: Record<string, string> = {
  USER_CREATED: 'ایجاد کاربر',
  USER_BANNED: 'مسدودسازی کاربر',
  USER_UNBANNED: 'رفع مسدودیت',
  ROLE_CHANGED: 'تغییر نقش',
  PASSWORD_RESET: 'بازنشانی رمز',
  SPECIFICATION_DELETED: 'حذف گروه درسی',
  SPECIFICATION_EDITED: 'ویرایش',
  FILE_DELETED: 'حذف فایل',
  FILE_VERSION_UPLOADED: 'بارگذاری نسخه جدید',
  PHASE_CHANGED: 'تغییر فاز',
  SEMESTER_CHANGED: 'تغییر نیم‌سال',
  FILE_REJECTED: 'رد فایل',
  LOGIN: 'ورود',
  LOGOUT: 'خروج',
};

export default function OwnerAuditPage() {
  const [filters, setFilters] = useState({
    actorId: '',
    actionType: '' as string,
    entityType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, String(v));
      });
      return (await apiClient.get(`/owner/audit?${params.toString()}`)).data.data;
    },
    refetchInterval: 30_000,
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="inline h-5 w-5 ml-1" />
            لاگ ممیزی
          </CardTitle>
          <CardDescription>
            تمام عملیات‌های حساس سیستم - {toPersianDigits(total)} مورد
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            فیلترها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>عملیات</Label>
              <Select value={filters.actionType} onValueChange={(v) => setFilters({ ...filters, actionType: v, page: 1 })}>
                <SelectTrigger>
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه</SelectItem>
                  {(Object.keys(AuditActionType) as Array<keyof typeof AuditActionType>).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PERSIAN_ACTION_LABELS[k] || k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نوع موجودیت</Label>
              <Input
                placeholder="مثلاً User یا ResourceFile"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}
              />
            </div>
            <div>
              <Label>شناسه کاربر</Label>
              <Input
                placeholder="actorId"
                value={filters.actorId}
                onChange={(e) => setFilters({ ...filters, actorId: e.target.value, page: 1 })}
              />
            </div>
            <div>
              <Label>تاریخ شروع</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              />
            </div>
            <div>
              <Label>تاریخ پایان</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ actorId: '', actionType: '', entityType: '', startDate: '', endDate: '', page: 1, limit: 50 })}
            >
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">در حال بارگذاری...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">موردی یافت نشد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>زمان</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead>نقش</TableHead>
                  <TableHead>عملیات</TableHead>
                  <TableHead>هدف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs persian-numerals">{l.timestampShamsi}</TableCell>
                    <TableCell>{l.actorName}</TableCell>
                    <TableCell>{PERSIAN_ROLE_NAMES[l.actorRole as Role]}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 rounded">
                        {PERSIAN_ACTION_LABELS[l.actionType] || l.actionType}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.targetEntityType}:<span className="text-muted-foreground">{l.targetEntityId.substring(0, 8)}...</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            قبلی
          </Button>
          <span className="text-sm flex items-center">
            صفحه {toPersianDigits(filters.page)} از {toPersianDigits(totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  );
}
