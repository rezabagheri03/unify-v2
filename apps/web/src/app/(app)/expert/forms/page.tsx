'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Trash2, Upload, Download, Pencil } from 'lucide-react';

export default function ExpertFormsPage() {
  const qc = useQueryClient();
  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => (await apiClient.get('/forms')).data.data.forms,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', signatureGuide: '' });
  const [file, setFile] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('signatureGuide', form.signatureGuide);
      if (file) fd.append('file', file);
      return (await apiClient.post('/forms', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    onSuccess: () => {
      toast.success('فرم بارگذاری شد');
      setOpen(false);
      setForm({ name: '', description: '', signatureGuide: '' });
      setFile(null);
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/forms/${id}`),
    onSuccess: () => {
      toast.success('حذف شد');
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <FileText className="inline h-5 w-5 ml-1" />
              فرم‌های اداری گروه
            </CardTitle>
            <CardDescription>مدیریت فرم‌های مخصوص گروه شما</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-1" />فرم جدید</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>بارگذاری فرم جدید</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
                className="space-y-3"
              >
                <div><Label>نام فرم</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>توضیحات</Label><Textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>راهنمای امضا/مهر</Label><Textarea required rows={2} value={form.signatureGuide} onChange={(e) => setForm({ ...form, signatureGuide: e.target.value })} /></div>
                <div><Label>فایل</Label><Input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
                <Button type="submit" disabled={create.isPending || !file}>
                  <Upload className="h-4 w-4 ml-1" />بارگذاری
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {(forms || []).filter((f: any) => f.departmentId).map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`/api/files/${f.filePath.replace(/^.*\/storage\//, '')}`} target="_blank">
                    <Download className="h-4 w-4 ml-1" />دانلود
                  </a>
                </Button>
                <ExpertEditFormDialog form={f} onSaved={() => qc.invalidateQueries({ queryKey: ['forms'] })} />
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)} aria-label="حذف فرم">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ExpertEditFormDialog({ form: f, onSaved }: { form: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: f.name,
    description: f.description,
    signatureGuide: f.signatureGuide,
  });
  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/forms/${f.id}`, form),
    onSuccess: () => {
      toast.success('فرم به‌روزرسانی شد');
      setOpen(false);
      onSaved();
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="ویرایش فرم">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>ویرایش فرم</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); update.mutate(); }} className="space-y-3">
          <div><Label>نام فرم</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>توضیحات</Label><Textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>راهنمای امضا/مهر</Label><Textarea required rows={2} value={form.signatureGuide} onChange={(e) => setForm({ ...form, signatureGuide: e.target.value })} /></div>
          <Button type="submit" disabled={update.isPending}>ذخیره</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
