'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export function RoleBasedRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    switch (user.role) {
      case 'STUDENT':
        router.replace('/student/dashboard');
        break;
      case 'PROFESSOR':
        router.replace('/professor');
        break;
      case 'EXPERT':
      case 'HEAD_OF_DEPARTMENT':
        router.replace('/expert');
        break;
      case 'SYSTEM_ADMIN':
        router.replace('/admin');
        break;
      case 'SYSTEM_OWNER':
        router.replace('/owner');
        break;
      default:
        router.replace('/login');
    }
  }, [user, router]);

  return null;
}
