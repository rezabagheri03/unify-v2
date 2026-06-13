'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Upload, AlertCircle, CheckCircle2, Download, X, FileSpreadsheet } from 'lucide-react';
import { useUploadWithProgress } from '@/hooks/useUploadWithProgress';
import { UploadProgressBar } from '@/components/shared/UploadProgressBar';
import { toPersianDigits } from '@/lib/shamsi-utils';

interface BulkUploadResult {
  createdCount: number;
  errors: Array<{ row: number; error: string; username?: string }>;
  passwordFileUrl: string | null;
}

export default function OwnerUsersPage() {
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await apiClient.get('/departments')).data.data.departments,
  });

  const [single, setSingle] = useState({
    username: '',
    role: 'STUDENT',
    departmentId: '',
    firstName: '',
    lastName: '',
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);

  const { upload, progress, isUploading, reset } = useUploadWithProgress();

  const createUser = useMutation({
    mutationFn: async () => {
      const selectedDept = departments?.find((d: any) => d.id === single.departmentId);
      return (
        await apiClient.post('/owner/users', {
          username: single.username,
          role: single.role,
          departmentCode: selectedDept?.code,
          firstName: single.firstName || undefined,
          lastName: single.lastName || undefined,
        })
      ).data.data;
    },
    onSuccess: (data) => {
      toast.success('کاربر ایجاد شد', `رمز عبور: ${data.generatedPassword}`);
      navigator.clipboard?.writeText(data.generatedPassword);
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const submitBulk = async () => {
    if (!bulkFile) return;
    const fd = new FormData();
    fd.append('excel_file', bulkFile);
    reset();
    await upload(
      '/owner/users/bulk-upload',
      fd,
      (data) => {
        setBulkResult(data);
        if (data.errors?.length === 0) {
          toast.success(`${toPersianDigits(data.createdCount)} کاربر ایجاد شد`);
        } else {
          toast.warning(
            `${toPersianDigits(data.createdCount)} کاربر ایجاد شد`,
            `${toPersianDigits(data.errors.length)} خطا — پنجره نتایج را ببینید`,
          );
        }
      },
      (err: any) => toast.error('خطا', err?.response?.data?.error?.message || 'خطای ناشناخته'),
    );
  };

  const requiresDept = ['STUDENT', 'PROFESSOR', 'EXPERT', 'HEAD_OF_DEPARTMENT'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ایجاد کاربر جدید</CardTitle>
          <CardDescription>رمز عبور به‌صورت خودکار تولید می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>نام کاربری</Label><Input required value={single.username} onChange={(e) => setSingle({ ...single, username: e.target.value })} /></div>
              <div><Label>نقش</Label>
                <Select value={single.role} onValueChange={(v) => setSingle({ ...single, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">دانشجو</SelectItem>
                    <SelectItem value="PROFESSOR">استاد</SelectItem>
                    <SelectItem value="EXPERT">کارشناس گروه</SelectItem>
                    <SelectItem value="HEAD_OF_DEPARTMENT">مدیر گروه</SelectItem>
                    <SelectItem value="SYSTEM_ADMIN">مدیر سیستم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {requiresDept.includes(single.role) && (
                <div className="col-span-2">
                  <Label>گروه آموزشی</Label>
                  <Select
                    value={single.departmentId}
                    onValueChange={(v) => setSingle({ ...single, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب گروه..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>نام</Label><Input value={single.firstName} onChange={(e) => setSingle({ ...single, firstName: e.target.value })} /></div>
              <div><Label>نام خانوادگی</Label><Input value={single.lastName} onChange={(e) => setSingle({ ...single, lastName: e.target.value })} /></div>
            </div>
            <Button
              type="submit"
              disabled={createUser.isPending || !single.username || (requiresDept.includes(single.role) && !single.departmentId)}
            >
              <UserPlus className="h-4 w-4 ml-1" />ایجاد کاربر
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>بارگذاری گروهی از اکسل</CardTitle>
          <CardDescription>ستون‌های مورد نیاز: username, role, departmentCode, firstName, lastName</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            disabled={isUploading}
          />
          <UploadProgressBar
            progress={progress}
            isUploading={isUploading}
            filename={bulkFile?.name}
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={submitBulk} disabled={!bulkFile || isUploading}>
              <Upload className="h-4 w-4 ml-1" />بارگذاری و ساخت کاربران
            </Button>
            <Button asChild variant="outline">
              <a href="/api/templates/user-bulk-upload.xlsx" download>
                <FileSpreadsheet className="h-4 w-4 ml-1" />
                دانلود نمونه فایل اکسل
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk upload result dialog */}
      {bulkResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>نتیجه بارگذاری گروهی</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setBulkResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">کاربران ایجاد شده</p>
                  <p className="text-2xl font-bold text-green-900 persian-numerals">
                    {toPersianDigits(bulkResult.createdCount)}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded flex items-center gap-2 ${bulkResult.errors.length > 0 ? 'bg-red-50' : 'bg-muted'}`}>
                <AlertCircle className={`h-5 w-5 ${bulkResult.errors.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm ${bulkResult.errors.length > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>خطاها</p>
                  <p className={`text-2xl font-bold persian-numerals ${bulkResult.errors.length > 0 ? 'text-red-900' : ''}`}>
                    {toPersianDigits(bulkResult.errors.length)}
                  </p>
                </div>
              </div>
            </div>

            {bulkResult.passwordFileUrl && (
              <Button variant="outline" asChild>
                <a href={bulkResult.passwordFileUrl} target="_blank" rel="noopener">
                  <Download className="h-4 w-4 ml-1" />
                  دانلود فایل رمزهای عبور تولید شده
                </a>
              </Button>
            )}

            {bulkResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  ردیف‌های دارای خطا ({toPersianDigits(bulkResult.errors.length)})
                </p>
                <div className="border rounded overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ردیف</TableHead>
                        <TableHead>نام کاربری</TableHead>
                        <TableHead>دلیل خطا</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResult.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="persian-numerals">
                            <Badge variant="destructive">{toPersianDigits(e.row)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {e.username || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-red-800">{e.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  فایل اکسل را اصلاح کنید و فقط ردیف‌های دارای خطا را مجدداً بارگذاری کنید.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
