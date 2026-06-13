'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { GraduationCap, Save, Send } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

export default function ExpertCurriculumPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/me')).data.data,
  });
  const deptId = profile?.department?.id;
  const [selectedYear, setSelectedYear] = useState(1403);
  const { data: chart } = useQuery({
    queryKey: ['curriculum', deptId, selectedYear],
    queryFn: async () =>
      deptId ? (await apiClient.get(`/curriculum/${deptId}/${selectedYear}`)).data.data : null,
    enabled: !!deptId,
  });

  const [nodes, setNodes] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  useState(() => {
    if (!initialized && chart?.chartData) {
      setNodes(chart.chartData);
      setInitialized(true);
    }
    return null;
  });

  const upload = useMutation({
    mutationFn: async () => {
      const data = { departmentId: deptId, entryYear: selectedYear, chartData: nodes };
      return (await apiClient.post('/curriculum', data)).data.data;
    },
    onSuccess: () => {
      toast.success('چارت درسی بارگذاری شد - در انتظار تأیید مدیر گروه');
      qc.invalidateQueries({ queryKey: ['curriculum', deptId, selectedYear] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <GraduationCap className="inline h-5 w-5 ml-1" />
            چارت درسی
          </CardTitle>
          <CardDescription>تعریف دروس هر ترم برای سال ورودی</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>سال ورودی</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1403, 1402, 1401, 1400, 1399].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {toPersianDigits(y)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => upload.mutate()} disabled={upload.isPending || !deptId}>
              <Save className="h-4 w-4 ml-1" />
              بارگذاری چارت
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            چارت فعلی شامل {nodes.length} درس است. برای ویرایش، فایل اکسل را بارگذاری کنید یا به‌صورت دستی گره‌ها را اضافه کنید.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>افزودن درس به چارت</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() =>
              setNodes([
                ...nodes,
                {
                  courseCode: '',
                  courseName: '',
                  credits: 3,
                  semester: 1,
                  prerequisites: [],
                  type: 'REQUIRED',
                },
              ])
            }
          >
            افزودن گره
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {nodes.map((node, idx) => (
          <Card key={idx}>
            <CardContent className="p-3 grid grid-cols-6 gap-2">
              <Input
                placeholder="کد درس"
                value={node.courseCode}
                onChange={(e) => {
                  const next = [...nodes];
                  next[idx] = { ...next[idx], courseCode: e.target.value };
                  setNodes(next);
                }}
              />
              <Input
                placeholder="نام درس"
                className="col-span-2"
                value={node.courseName}
                onChange={(e) => {
                  const next = [...nodes];
                  next[idx] = { ...next[idx], courseName: e.target.value };
                  setNodes(next);
                }}
              />
              <Input
                type="number"
                placeholder="واحد"
                value={node.credits}
                onChange={(e) => {
                  const next = [...nodes];
                  next[idx] = { ...next[idx], credits: parseInt(e.target.value) };
                  setNodes(next);
                }}
              />
              <Input
                type="number"
                placeholder="ترم"
                value={node.semester}
                onChange={(e) => {
                  const next = [...nodes];
                  next[idx] = { ...next[idx], semester: parseInt(e.target.value) };
                  setNodes(next);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNodes(nodes.filter((_, i) => i !== idx))}
              >
                ×
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
