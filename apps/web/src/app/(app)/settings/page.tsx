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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ThemePicker } from '@/components/shared/ThemePicker';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { PERSIAN_STATUS_NAMES } from '@/lib/shamsi-utils';
import { AcademicStatus } from '@unify/shared-types';
import { Save, User, Palette, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/me')).data.data,
  });

  useEffect(() => {
    if (profile?.supplementaryInfo) {
      const match = profile.supplementaryInfo.match(/PHOTO_URL:([^\s]+)/);
      if (match) setPhotoUrl(match[1]);
    }
  }, [profile]);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    emailAddress: '',
    supplementaryInfo: '',
    academicStatus: AcademicStatus.NORMAL as AcademicStatus,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        mobileNumber: profile.mobileNumber || '',
        emailAddress: profile.emailAddress || '',
        supplementaryInfo: profile.supplementaryInfo || '',
        academicStatus: profile.academicStatus || AcademicStatus.NORMAL,
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () =>
      (
        await apiClient.patch('/users/me', {
          firstName: form.firstName,
          lastName: form.lastName,
          mobileNumber: form.mobileNumber || undefined,
          emailAddress: form.emailAddress || undefined,
          supplementaryInfo: form.supplementaryInfo || undefined,
          academicStatus: form.academicStatus,
        })
      ).data.data,
    onSuccess: () => {
      toast.success('تنظیمات ذخیره شد');
      if (user) {
        setUser({
          ...user,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
        });
      }
    },
    onError: (err: any) => toast.error('خطا', err?.response?.data?.error?.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تنظیمات</CardTitle>
          <CardDescription>تنظیمات شخصی حساب کاربری شما</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 ml-1" />
            پروفایل
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="h-4 w-4 ml-1" />
            تم
          </TabsTrigger>
          <TabsTrigger value="photo">
            <ImageIcon className="h-4 w-4 ml-1" />
            تصویر پروفایل
          </TabsTrigger>
        </TabsList>

          <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات شخصی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">نام</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mobileNumber">شماره موبایل (اختیاری)</Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    value={form.mobileNumber}
                    onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                    placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="emailAddress">ایمیل (اختیاری)</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={form.emailAddress}
                    onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="supplementaryInfo">سایر اطلاعات تکمیلی</Label>
                <Input
                  id="supplementaryInfo"
                  value={form.supplementaryInfo}
                  onChange={(e) => setForm({ ...form, supplementaryInfo: e.target.value })}
                  placeholder="هر اطلاعات دیگری که می‌خواهید به اشتراک بگذارید..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  این اطلاعات فقط در صورتی برای کارکنان قابل مشاهده است که شما آن را اضافه کنید.
                </p>
              </div>
              <div>
                <Label htmlFor="academicStatus">وضعیت تحصیلی</Label>
                <Select
                  value={form.academicStatus}
                  onValueChange={(v) => setForm({ ...form, academicStatus: v as AcademicStatus })}
                >
                  <SelectTrigger id="academicStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AcademicStatus) as AcademicStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {PERSIAN_STATUS_NAMES[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  تعیین‌کننده حداکثر واحد قابل ثبت‌نام است. سامانه صحت آن را تأیید نمی‌کند.
                </p>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="h-4 w-4 ml-1" />
                ذخیره
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <ThemePicker />
        </TabsContent>

        <TabsContent value="photo">
          <PhotoUpload currentPhotoUrl={photoUrl} onUploaded={setPhotoUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
