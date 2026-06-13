'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, OnboardingInput } from '@unify/shared-types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema) });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const onSubmit = async (data: OnboardingInput) => {
    setLoading(true);
    try {
      await apiClient.post('/onboarding', { ...data, darkMode });
      setUser({
        ...user!,
        firstName: data.firstName,
        lastName: data.lastName,
        themePreference: data.themePreference || 'default',
        darkMode,
      });
      toast.success('خوش آمدید', 'ورود اولیه با موفقیت تکمیل شد');
      router.push('/student/dashboard');
    } catch {
      toast.error('خطا', 'ورود اولیه ناموفق بود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>تکمیل پروفایل</CardTitle>
          <CardDescription>لطفاً اطلاعات زیر را برای تکمیل فرآیند ورود اولیه وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
            <div className="space-y-2">
              <Label htmlFor="firstName">نام</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">نام خانوادگی</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="darkMode">حالت تاریک</Label>
              <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              تکمیل و ورود
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
