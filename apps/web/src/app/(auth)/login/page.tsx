'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@unify/shared-types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { Loader2, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', data);
      const result = res.data.data;
      setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
      if (!result.onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push(redirectByRole(result.user.role));
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
      toast.error('خطا در ورود', msg || 'نام کاربری یا رمز عبور اشتباه است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-9 w-9 text-primary" />
          </div>
          <CardTitle className="text-3xl">یونیفای</CardTitle>
          <CardDescription>دستیار یکپارچه دانشگاهی - ورود به سامانه</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            dir="rtl"
            noValidate // a11y: use our Persian Zod messages instead of browser tooltips
          >
            <div className="space-y-2">
              <Label htmlFor="username">شماره دانشجویی / شناسه پرسنلی</Label>
              <Input
                id="username"
                placeholder="مثال: ۹۹۰۱۲۳۴۵"
                autoComplete="username"
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
                {...register('username')}
              />
              {errors.username && (
                <p id="username-error" role="alert" className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="رمز عبور خود را وارد کنید"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" role="alert" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              ورود
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              برای بازیابی رمز عبور، به دفتر IT دانشگاه مراجعه کنید.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function redirectByRole(role: string): string {
  switch (role) {
    case 'STUDENT': return '/student/dashboard';
    case 'PROFESSOR': return '/professor';
    case 'EXPERT':
    case 'HEAD_OF_DEPARTMENT': return '/expert';
    case 'SYSTEM_ADMIN': return '/admin';
    case 'SYSTEM_OWNER': return '/owner';
    default: return '/';
  }
}
