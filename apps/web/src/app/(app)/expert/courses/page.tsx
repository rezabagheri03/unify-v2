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
import { Plus, Trash2 } from 'lucide-react';

export default function ExpertCoursesPage() {
  const qc = useQueryClient();
  const { data: courses } = useQuery({
    queryKey: ['dept-courses'],
    queryFn: async () => (await apiClient.get('/expert/courses')).data.data.courses,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', credits: 3 });

  const create = useMutation({
    mutationFn: async () => (await apiClient.post('/expert/courses', form)).data.data,
    onSuccess: () => {
      toast.success('درس ایجاد شد');
      setOpen(false);
      setForm({ code: '', name: '', credits: 3 });
      qc.invalidateQueries({ queryKey: ['dept-courses'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>مدیریت دروس</CardTitle>
            <CardDescription>دروس متعلق به گروه شما</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" />درس جدید</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>درس جدید</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
                <div><Label>کد درس</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>نام درس</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>واحد</Label><Input type="number" required min={0} max={10} value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) })} /></div>
                <Button type="submit" disabled={create.isPending}>ایجاد</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>واحد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(courses || []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.credits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
