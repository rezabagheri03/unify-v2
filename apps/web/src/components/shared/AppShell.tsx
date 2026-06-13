'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Moon, Sun, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Role, PERSIAN_ROLE_NAMES } from '@unify/shared-types';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  // Student
  { href: '/student/dashboard', label: 'داشبورد', roles: [Role.STUDENT] },
  { href: '/student/scheduler', label: 'برنامه‌ریز', roles: [Role.STUDENT] },
  { href: '/student/resources', label: 'منابع', roles: [Role.STUDENT] },
  { href: '/student/inbox', label: 'صندوق ورودی', roles: [Role.STUDENT] },
  { href: '/student/tickets', label: 'تیکت‌ها', roles: [Role.STUDENT] },
  { href: '/student/utilities', label: 'ابزارها', roles: [Role.STUDENT] },
  { href: '/student/notices', label: 'اطلاعیه‌ها', roles: [Role.STUDENT] },
  { href: '/student/preferences', label: 'تنظیمات اعلان', roles: [Role.STUDENT] },
  { href: '/settings', label: 'تنظیمات', roles: Object.values(Role) },
  // Professor
  { href: '/professor', label: 'داشبورد استاد', roles: [Role.PROFESSOR] },
  { href: '/professor/files', label: 'فایل‌های من', roles: [Role.PROFESSOR] },
  { href: '/professor/students', label: 'دانشجویان', roles: [Role.PROFESSOR] },
  { href: '/professor/messages', label: 'پیام کلاسی', roles: [Role.PROFESSOR] },
  { href: '/professor/notices', label: 'تابلو اعلانات', roles: [Role.PROFESSOR] },
  { href: '/professor/faq', label: 'سؤالات متداول', roles: [Role.PROFESSOR] },
  { href: '/professor/approvals', label: 'تأیید فایل‌ها', roles: [Role.PROFESSOR] },
  // Expert / Head
  { href: '/expert', label: 'داشبورد کارشناس', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/courses', label: 'مدیریت دروس', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/specifications', label: 'گروه‌های درسی', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/students', label: 'دانشجویان', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/curriculum', label: 'چارت درسی', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/prerequisites', label: 'پیش‌نیازها', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/forms', label: 'فرم‌ها', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/messaging', label: 'پیام هدفمند', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/tickets', label: 'تیکت‌ها', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  { href: '/expert/approvals', label: 'تأیید فایل‌ها', roles: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] },
  // Head only
  { href: '/head/professors', label: 'نظارت بر اساتید', roles: [Role.HEAD_OF_DEPARTMENT] },
  { href: '/head/curricula', label: 'تأیید چارت درسی', roles: [Role.HEAD_OF_DEPARTMENT] },
  // Admin
  { href: '/admin', label: 'داشبورد مدیر', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/phase', label: 'مدیریت فاز', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/semesters', label: 'نیم‌سال‌ها', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/users', label: 'کاربران', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/tickets', label: 'تیکت‌های ارجاعی', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/files', label: 'مدیریت فایل‌ها', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/forms', label: 'فرم‌های سراسری', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/messaging', label: 'پیام سراسری', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/calendar', label: 'تقویم آموزشی', roles: [Role.SYSTEM_ADMIN] },
  { href: '/admin/logo', label: 'لوگوی سامانه', roles: [Role.SYSTEM_ADMIN] },
  // Owner
  { href: '/owner', label: 'داشبورد مدیر ارشد', roles: [Role.SYSTEM_OWNER] },
  { href: '/owner/users', label: 'مدیریت کاربران', roles: [Role.SYSTEM_OWNER] },
  { href: '/owner/audit', label: 'لاگ ممیزی', roles: [Role.SYSTEM_OWNER] },
  { href: '/owner/analytics', label: 'تحلیل‌ها', roles: [Role.SYSTEM_OWNER] },
  { href: '/owner/departments', label: 'مدیریت گروه‌ها', roles: [Role.SYSTEM_OWNER] },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Read photo URL from /users/me (it lives in supplementaryInfo)
  useEffect(() => {
    if (!user) return;
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('unify-auth') ? JSON.parse(localStorage.getItem('unify-auth')!).state.accessToken : ''}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const info = d?.data?.supplementaryInfo || '';
        const match = info.match(/PHOTO_URL:([^\s]+)/);
        if (match) setPhotoUrl(match[1]);
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const userNav = navItems.filter((n) => n.roles.includes(user.role));

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        role="navigation"
        aria-label="منوی اصلی"
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-64 border-l bg-card transition-transform',
          // On mobile, hide by default; on desktop (md+), always show
          sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">یونیفای</h1>
            <p className="text-xs text-muted-foreground mt-1">{PERSIAN_ROLE_NAMES[user.role]}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {userNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-accent text-foreground',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={fullName} />
                ) : null}
                <AvatarFallback className="text-xs">{fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.username}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="flex-1">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="flex-1"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:mr-64">
        <header
          className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b h-14 flex items-center px-4"
          role="banner"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground md:hidden" aria-label="نقش کاربر">
            {PERSIAN_ROLE_NAMES[user.role]}
          </span>
        </header>
        <main id="main-content" role="main" className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
