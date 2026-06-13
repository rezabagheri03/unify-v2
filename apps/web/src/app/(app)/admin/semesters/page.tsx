'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Check } from 'lucide-react';
import { toShamsi } from '@/lib/shamsi-utils';

export default function AdminSemestersPage() {
  const qc = useQueryClient();
  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => (await apiClient.get('/admin/semesters')).data.data.semesters,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/admin/semesters', form)).data.data,
    onSuccess: () => {
      toast.success('نیم‌سال ایجاد شد');
      setOpen(false);
      setForm({ name: '', startDate: '', endDate: '' });
      qc.invalidateQueries({ queryKey: ['semesters'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const setCurrent = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/admin/semesters/${id}/set-current`),
    onSuccess: () => {
      toast.success('نیم‌سال جاری تغییر کرد');
      qc.invalidateQueries({ queryKey: ['semesters'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <Calendar className="inline h-5 w-5 ml-1" />
              مدیریت نیم‌سال‌ها
            </CardTitle>
            <CardDescription>ایجاد و فعال‌سازی نیم‌سال‌ها</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />نیم‌سال جدید
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ایجاد نیم‌سال</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
                className="space-y-3"
              >
                <div>
                  <Label>نام</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: پاییز ۱۴۰۳"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>تاریخ شروع (شمسی)</Label>
                    <Input
                      required
                      placeholder="۱۴۰۳/۰۶/۳۱"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>تاریخ پایان (شمسی)</Label>
                    <Input
                      required
                      placeholder="۱۴۰۳/۱۰/۳۰"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={create.isPending}>ایجاد</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>شروع</TableHead>
                <TableHead>پایان</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(semesters || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="persian-numerals">{toShamsi(new Date(s.startDate))}</TableCell>
                  <TableCell className="persian-numerals">{toShamsi(new Date(s.endDate))}</TableCell>
                  <TableCell>
                    {s.isCurrent ? (
                      <Badge>جاری</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setCurrent.mutate(s.id)}>
                        <Check className="h-3 w-3 ml-1" />فعال‌سازی
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.isCurrent && (
                      <span className="text-xs text-muted-foreground">
                        فاز: {s.currentPhase}
                      </span>
                    )}
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
