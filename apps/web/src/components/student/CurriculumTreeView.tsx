'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';
import { CoursePrereqPopup } from '@/components/student/CoursePrereqPopup';

interface CurriculumNode {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  type: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
}

interface Props {
  chartData: CurriculumNode[];
  passedCodes?: string[];
  onTogglePassed?: (code: string) => void;
}

/**
 * Tree-view visualization with popup-on-click (Golden Doc §2.6.1):
 * "Clicking a course node shows prerequisite relationships" (via CoursePrereqPopup).
 */
export function CurriculumTreeView({ chartData, passedCodes = [], onTogglePassed }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(chartData.map((n) => n.courseCode)));
  const semesters = Array.from(new Set(chartData.map((n) => n.semester))).sort((a, b) => a - b);

  const toggle = (code: string) => {
    const next = new Set(expanded);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpanded(next);
  };

  const isPrereqsSatisfied = (node: CurriculumNode): boolean => {
    return node.prerequisites.every((p) => passedCodes.includes(p));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
        <GraduationCap className="h-4 w-4" />
        چارت درسی - {toPersianDigits(chartData.length)} درس در {toPersianDigits(semesters.length)} ترم
      </p>
      <p className="text-xs text-muted-foreground">
        روی هر درس کلیک کنید تا پیش‌نیازهای آن را در پنجره بازشو ببینید.
      </p>
      {semesters.map((sem) => {
        const nodes = chartData.filter((n) => n.semester === sem);
        return (
          <div key={sem} className="border-r-4 border-primary pr-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <p className="font-bold text-sm">ترم {toPersianDigits(sem)}</p>
              <Badge variant="secondary" className="text-xs">
                {toPersianDigits(nodes.length)} درس
              </Badge>
            </div>
            <div className="space-y-2">
              {nodes.map((n) => {
                const passed = passedCodes.includes(n.courseCode);
                const prereqsOk = isPrereqsSatisfied(n);
                const isExpanded = expanded.has(n.courseCode);
                return (
                  <div key={n.courseCode} className="border rounded-md overflow-hidden">
                    <CoursePrereqPopup
                      node={n}
                      allNodes={chartData}
                      passed={passed}
                      prereqsSatisfied={prereqsOk}
                      onTogglePassed={onTogglePassed ? () => onTogglePassed(n.courseCode) : undefined}
                      trigger={
                        <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {n.prerequisites.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggle(n.courseCode);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronRight className="h-3 w-3" />
                                ) : (
                                  <ChevronLeft className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <div>
                              <p className="font-medium text-sm">{n.courseName}</p>
                              <p className="text-xs text-muted-foreground persian-numerals">
                                {n.courseCode} - {toPersianDigits(n.credits)} واحد
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {passed && <Check className="h-4 w-4 text-green-600" />}
                            <Badge
                              variant={n.type === 'REQUIRED' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {n.type === 'REQUIRED' ? 'اصلی' : n.type === 'ELECTIVE' ? 'اختیاری' : 'عمومی'}
                            </Badge>
                          </div>
                        </div>
                      }
                    />
                    {isExpanded && n.prerequisites.length > 0 && (
                      <div className="bg-muted/30 p-2 border-t text-xs">
                        <p className="font-medium text-muted-foreground mb-1">پیش‌نیازها (پیش‌نمایش):</p>
                        <div className="flex flex-wrap gap-1">
                          {n.prerequisites.map((code) => (
                            <Badge key={code} variant="outline" className="gap-1">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
