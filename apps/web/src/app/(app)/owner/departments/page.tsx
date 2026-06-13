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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Building2 } from 'lucide-react';

export default function OwnerDepartmentsPage() {
  const qc = useQueryClient();
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await apiClient.get('/departments')).data.data.departments,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/departments', form)).data.data,
    onSuccess: () => {
      toast.success('گروه ایجاد شد');
      setOpen(false);
      setForm({ name: '', code: '' });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success('حذف شد');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <Building2 className="inline h-5 w-5 ml-1" />
              مدیریت گروه‌های آموزشی
            </CardTitle>
            <CardDescription>ایجاد گروه‌های آموزشی برای دانشکده‌ها</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-1" />گروه جدید
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ایجاد گروه آموزشی</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
                className="space-y-3"
              >
                <div>
                  <Label>نام گروه</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>کد گروه</Label>
                  <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS, EE, ME" />
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
                <TableHead>کد</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(departments || []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="font-mono">{d.code}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
