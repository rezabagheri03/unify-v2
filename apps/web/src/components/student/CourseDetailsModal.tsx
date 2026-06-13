'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Bell, HelpCircle, MessageCircle } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';
import { SafeText } from '@/lib/sanitize';

interface Props {
  specificationId: string;
  telegramLink?: string | null;
}

export function CourseDetailsModal({ specificationId, telegramLink }: Props) {
  const { data } = useQuery({
    queryKey: ['syllabus', specificationId],
    queryFn: async () => (await apiClient.get(`/syllabus/specification/${specificationId}`)).data.data,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Info className="h-4 w-4 ml-1" />
          جزئیات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.specification?.courseName}</DialogTitle>
        </DialogHeader>

        {data && (
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info"><Info className="h-4 w-4 ml-1" />اطلاعات</TabsTrigger>
              <TabsTrigger value="notices"><Bell className="h-4 w-4 ml-1" />اطلاعیه‌ها</TabsTrigger>
              <TabsTrigger value="faq"><HelpCircle className="h-4 w-4 ml-1" />سؤالات</TabsTrigger>
              {telegramLink && <TabsTrigger value="telegram"><MessageCircle className="h-4 w-4 ml-1" />گروه</TabsTrigger>}
            </TabsList>

            <TabsContent value="info" className="space-y-3 pt-3">
              <Row label="کد درس" value={data.specification.courseCode} />
              <Row label="استاد" value={data.specification.professorName} />
              <Row label="واحد" value={toPersianDigits(data.specification.credits)} />
              <Row label="مکان کلاس" value={data.specification.classroomLocation} />
              <Row label="زمان کلاس" value={`${data.specification.classStartTime} - ${data.specification.classEndTime}`} />
              {data.specification.finalExamDate && (
                <>
                  <div className="border-t pt-3">
                    <p className="font-medium mb-2">امتحان پایان‌ترم</p>
                    <Row label="تاریخ" value={data.specification.finalExamDate} />
                    <Row label="ساعت" value={data.specification.finalExamTime || ''} />
                    <Row label="مکان" value={data.specification.finalExamLocation || ''} />
                  </div>
                </>
              )}
              {data.specification.midtermExamDate && (
                <div className="border-t pt-3">
                  <p className="font-medium mb-2">
                    <Badge variant="destructive" className="bg-orange-500">میان‌ترم</Badge>
                  </p>
                  <Row label="تاریخ" value={data.specification.midtermExamDate} />
                  <Row label="ساعت" value={data.specification.midtermExamTime || ''} />
                  <Row label="مکان" value={data.specification.midtermExamLocation || ''} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="notices" className="space-y-2 pt-3">
              {data.notices?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">اطلاعیه‌ای نیست.</p>
              ) : (
                data.notices?.map((n: any) => (
                  <div key={n.id} className="border-r-4 border-primary pr-3 py-2">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm mt-1"><SafeText text={n.content} /></p>
                    <p className="text-xs text-muted-foreground mt-1 persian-numerals">{n.createdAt}</p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="faq" className="space-y-2 pt-3">
              {data.faqs?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">سؤالی نیست.</p>
              ) : (
                data.faqs?.map((f: any) => (
                  <div key={f.id} className="border rounded-md p-3">
                    <p className="font-medium">{f.question}</p>
                    <p className="text-sm text-muted-foreground mt-1"><SafeText text={f.answer} /></p>
                  </div>
                ))
              )}
            </TabsContent>

            {telegramLink && (
              <TabsContent value="telegram" className="pt-3">
                <Button asChild className="w-full">
                  <a href={telegramLink} target="_blank" rel="noopener">
                    <MessageCircle className="h-4 w-4 ml-1" />
                    ورود به گروه تلگرام
                  </a>
                </Button>
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium persian-numerals">{value}</span>
    </div>
  );
}
