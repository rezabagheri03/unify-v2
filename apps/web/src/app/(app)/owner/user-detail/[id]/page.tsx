'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { KeyRound, UserCog, Ban, CheckCircle } from 'lucide-react';
import { PERSIAN_ROLE_NAMES } from '@/lib/shamsi-utils';
import { Role } from '@unify/shared-types';

export default function OwnerUserDetailPage() {
  const { id } = useParams();
  const { data: user, refetch } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => (await apiClient.get(`/admin/users?q=`)).data.data.users.find((u: any) => u.id === id),
  });

  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');

  const resetPwd = useMutation({
    mutationFn: async () =>
      (await apiClient.patch(`/owner/users/${id}/reset-password`, { newPassword: newPassword || undefined })).data.data,
    onSuccess: (data) => {
      toast.success('رمز عبور تغییر کرد', data.newPassword);
      navigator.clipboard?.writeText(data.newPassword);
      setNewPassword('');
    },
  });

  const changeRole = useMutation({
    mutationFn: async () => (await apiClient.patch(`/owner/users/${id}/role`, { role: newRole })).data.data,
    onSuccess: () => {
      toast.success('نقش تغییر کرد');
      refetch();
    },
  });

  const toggleBan = useMutation({
    mutationFn: async () => (await apiClient.patch(`/admin/users/${id}/ban`, { isActive: !user?.isActive })).data.data,
    onSuccess: () => {
      toast.success('وضعیت تغییر کرد');
      refetch();
    },
  });

  if (!user) return <p>در حال بارگذاری...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}</CardTitle>
          <CardDescription>{user.username} - {PERSIAN_ROLE_NAMES[user.role as Role]}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <KeyRound className="inline h-5 w-5 ml-1" />
            بازنشانی رمز عبور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>رمز جدید (خالی = تولید خودکار)</Label>
            <Input
              type="text"
              placeholder="حداقل ۸ کاراکتر، شامل حرف بزرگ، کوچک، عدد و کاراکتر خاص"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={() => resetPwd.mutate()} disabled={resetPwd.isPending}>
            تنظیم رمز جدید
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <UserCog className="inline h-5 w-5 ml-1" />
            تغییر نقش
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={newRole || user.role} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">دانشجو</SelectItem>
              <SelectItem value="PROFESSOR">استاد</SelectItem>
              <SelectItem value="EXPERT">کارشناس گروه</SelectItem>
              <SelectItem value="HEAD_OF_DEPARTMENT">مدیر گروه</SelectItem>
              <SelectItem value="SYSTEM_ADMIN">مدیر سیستم</SelectItem>
              <SelectItem value="SYSTEM_OWNER">مدیر ارشد سیستم</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => changeRole.mutate()} disabled={!newRole || changeRole.isPending}>
            تغییر نقش
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {user.isActive ? <Ban className="inline h-5 w-5 ml-1" /> : <CheckCircle className="inline h-5 w-5 ml-1" />}
            {user.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant={user.isActive ? 'destructive' : 'default'}
            onClick={() => toggleBan.mutate()}
          >
            {user.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
