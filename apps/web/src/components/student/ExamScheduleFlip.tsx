'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { PERSIAN_DAY_NAMES, toPersianDigits } from '@/lib/shamsi-utils';
import { Day } from '@unify/shared-types';

interface Exam {
  specificationId: string;
  courseName: string;
  professorName: string;
  examType: 'FINAL' | 'MIDTERM';
  date: { dateUtc: string; dateShamsi: string };
  time: string;
  location: string;
}

interface EnrolledSpec {
  specificationId: string;
  courseName: string;
  professorName: string;
  classDays: Day[];
  classStartTime: string;
  classEndTime: string;
  classroomLocation: string;
}

interface Props {
  enrollments: EnrolledSpec[];
  exams: Exam[];
}

const flipVariants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
};

export function ExamScheduleFlip({ enrollments, exams }: Props) {
  const [flipped, setFlipped] = useState(false);

  const days: Day[] = [Day.SATURDAY, Day.SUNDAY, Day.MONDAY, Day.TUESDAY, Day.WEDNESDAY];

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <Button
          onClick={() => setFlipped(!flipped)}
          variant={flipped ? 'outline' : 'default'}
        >
          {flipped ? (
            <>
              <ArrowRight className="h-4 w-4 ml-1" />
              بازگشت به برنامه هفتگی
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 ml-1" />
              مشاهده برنامه امتحانات
            </>
          )}
        </Button>
      </div>

      <motion.div
        className="flip-card relative h-[500px]"
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="flip-card-inner relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={flipped ? 'back' : 'front'}
          variants={flipVariants}
          transition={{ duration: 0.7 }}
        >
          {/* FRONT: Weekly Timetable */}
          <div
            className="flip-card-front absolute inset-0"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="grid grid-cols-5 gap-2 h-full">
              {days.map((day) => {
                const dayClasses = enrollments.filter((e) => e.classDays.includes(day));
                return (
                  <div key={day} className="border rounded-md p-2 bg-card overflow-y-auto">
                    <p className="font-medium text-sm mb-2 text-center border-b pb-1">
                      {PERSIAN_DAY_NAMES[day]}
                    </p>
                    <div className="space-y-1">
                      {dayClasses.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">-</p>
                      ) : (
                        dayClasses.map((c, i) => (
                          <div
                            key={i}
                            className="bg-primary/10 rounded p-2 text-xs"
                          >
                            <p className="font-medium">{c.courseName}</p>
                            <p className="text-muted-foreground persian-numerals">
                              {toPersianDigits(c.classStartTime)} - {toPersianDigits(c.classEndTime)}
                            </p>
                            <p className="text-muted-foreground">{c.classroomLocation}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BACK: Exam List */}
          <div
            className="flip-card-back absolute inset-0 overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="space-y-2">
              <h3 className="font-bold text-lg mb-3 text-center">برنامه امتحانات</h3>
              {exams.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  امتحانی برای شما ثبت نشده است.
                </p>
              ) : (
                exams.map((e, i) => (
                  <Card key={i} className={e.examType === 'MIDTERM' ? 'border-orange-500' : ''}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{e.courseName}</p>
                          <p className="text-xs text-muted-foreground">{e.professorName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{e.location}</p>
                        </div>
                        <div className="text-left">
                          <Badge
                            variant={e.examType === 'MIDTERM' ? 'destructive' : 'default'}
                            className={e.examType === 'MIDTERM' ? 'bg-orange-500' : ''}
                          >
                            {e.examType === 'MIDTERM' ? 'میان‌ترم' : 'پایان‌ترم'}
                          </Badge>
                          <p className="text-sm persian-numerals mt-2">{e.date.dateShamsi}</p>
                          <p className="text-xs persian-numerals text-muted-foreground">
                            ساعت {toPersianDigits(e.time)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Inline Card reference (since we import in many places)
import { Card, CardContent } from '@/components/ui/card';
