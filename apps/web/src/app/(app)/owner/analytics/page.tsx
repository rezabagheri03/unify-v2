'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Activity, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toPersianDigits } from '@/lib/shamsi-utils';
import { PERSIAN_ROLE_NAMES } from '@unify/shared-types';
import { Role } from '@unify/shared-types';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#ec4899'];

export default function OwnerAnalyticsPage() {
  // Golden Doc §3.6.5: "per time period" — configurable
  const [timeRange, setTimeRange] = useState('7d');
  const { data } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => (await apiClient.get(`/owner/analytics?timeRange=${timeRange}`)).data.data,
  });

  const byRoleData = data?.activeUsers?.byRole
    ? Object.entries(data.activeUsers.byRole).map(([role, count]) => ({
        name: PERSIAN_ROLE_NAMES[role as Role] || role,
        value: count,
      }))
    : [];

  const topCoursesData = (data?.downloads?.byCourse || []).slice(0, 10).map((c: any) => ({
    name: c.courseName.length > 20 ? c.courseName.substring(0, 20) + '...' : c.courseName,
    files: c.count,
  }));

  const topProfsData = (data?.downloads?.byProfessor || []).slice(0, 10).map((p: any) => ({
    name: p.professorName,
    files: p.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-medium">تحلیل‌های عملکرد سامانه</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">۲۴ ساعت اخیر</SelectItem>
            <SelectItem value="7d">۷ روز اخیر</SelectItem>
            <SelectItem value="30d">۳۰ روز اخیر</SelectItem>
            <SelectItem value="all">از ابتدا</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="کاربران فعال روزانه"
          value={data?.activeUsers?.daily || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title={`دانلودها (${timeRange})`}
          value={data?.downloads?.inPeriod || 0}
          icon={<Download className="h-4 w-4" />}
        />
        <StatCard
          title="نرخ استفاده از برنامه‌ریز"
          value={`${(data?.engagement?.schedulerUsageRate || 0).toFixed(1)}%`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="پیام‌های هفته اخیر"
          value={data?.engagement?.messagesThisWeek || 0}
          icon={<Users className="h-4 w-4" />}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>توزیع کاربران بر اساس نقش</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {byRoleData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>پرطرفدارترین دروس</CardTitle>
            <CardDescription>بر اساس تعداد فایل بارگذاری شده</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCoursesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="files" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>پرکارترین اساتید</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProfsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="files" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>آمار تیکت‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-muted rounded">
                <span>کل تیکت‌ها</span>
                <span className="font-bold persian-numerals">{toPersianDigits(data?.engagement?.ticketsTotal || 0)}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded">
                <span>ارجاعی به مدیر</span>
                <span className="font-bold persian-numerals text-red-700">
                  {toPersianDigits(data?.engagement?.ticketsEscalated || 0)}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-blue-50 rounded">
                <span>پیام‌های هفته اخیر</span>
                <span className="font-bold persian-numerals">
                  {toPersianDigits(data?.engagement?.messagesThisWeek || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold persian-numerals">
          {typeof value === 'number' ? toPersianDigits(value) : value}
        </p>
      </CardContent>
    </Card>
  );
}
