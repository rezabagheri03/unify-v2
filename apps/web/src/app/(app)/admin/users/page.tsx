'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ban, CheckCircle, Search } from 'lucide-react';
import { PERSIAN_ROLE_NAMES } from '@/lib/shamsi-utils';
import { Role } from '@unify/shared-types';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: users } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => (await apiClient.get(`/admin/users?q=${search}`)).data.data.users,
  });

  const toggleBan = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiClient.patch(`/admin/users/${id}/ban`, { isActive })).data.data,
    onSuccess: () => {
      toast.success('وضعیت کاربر تغییر کرد');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>مدیریت کاربران</CardTitle>
        <CardDescription>جستجو، مشاهده و تغییر وضعیت فعال بودن</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجو بر اساس نام یا شماره..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شناسه</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead>گروه</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users || []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</TableCell>
                <TableCell>{PERSIAN_ROLE_NAMES[u.role as Role]}</TableCell>
                <TableCell>{u.department?.name || '-'}</TableCell>
                <TableCell>{u.isActive ? <Badge>فعال</Badge> : <Badge variant="destructive">غیرفعال</Badge>}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={u.isActive ? 'destructive' : 'default'}
                    onClick={() => toggleBan.mutate({ id: u.id, isActive: !u.isActive })}
                  >
                    {u.isActive ? <><Ban className="h-4 w-4 ml-1" />غیرفعال</> : <><CheckCircle className="h-4 w-4 ml-1" />فعال</>}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
