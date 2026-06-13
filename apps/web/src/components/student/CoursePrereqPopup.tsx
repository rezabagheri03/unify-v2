'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '@/lib/shamsi-utils';

interface CurriculumNode {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  type: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
}

interface Props {
  node: CurriculumNode;
  allNodes: CurriculumNode[];
  /** True if user has marked this course as passed */
  passed?: boolean;
  /** True if user has marked all prerequisites as passed */
  prereqsSatisfied?: boolean;
  onTogglePassed?: () => void;
  trigger: React.ReactNode;
}

/**
 * Popup that shows a course's prerequisite relationships (Golden Doc §2.6.1):
 * "Prerequisite Popup: Clicking a course node shows prerequisite relationships"
 */
export function CoursePrereqPopup({ node, allNodes, passed, prereqsSatisfied, onTogglePassed, trigger }: Props) {
  const prereqNodes = node.prerequisites
    .map((code) => allNodes.find((n) => n.courseCode === code))
    .filter((n): n is CurriculumNode => Boolean(n));

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {node.courseName}
            <span className="text-sm text-muted-foreground mr-2 persian-numerals">({node.courseCode})</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">واحد</p>
              <p className="font-medium persian-numerals">{toPersianDigits(node.credits)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ترم</p>
              <p className="font-medium persian-numerals">{toPersianDigits(node.semester)}</p>
            </div>
            <div className="col-span-2">
              <Badge variant={node.type === 'REQUIRED' ? 'default' : 'secondary'}>
                {node.type === 'REQUIRED' ? 'اصلی' : node.type === 'ELECTIVE' ? 'اختیاری' : 'عمومی'}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              پیش‌نیازها ({toPersianDigits(prereqNodes.length)})
            </h3>
            {prereqNodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">این درس پیش‌نیاز ندارد.</p>
            ) : (
              <div className="space-y-2">
                {prereqNodes.map((p) => (
                  <div key={p.courseCode} className="border-r-4 border-primary pr-3 py-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.courseName}</p>
                        <p className="text-xs text-muted-foreground persian-numerals">
                          کد: {p.courseCode} - ترم {toPersianDigits(p.semester)} - {toPersianDigits(p.credits)} واحد
                        </p>
                      </div>
                      {passed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onTogglePassed && (
            <Button
              variant={passed ? 'default' : 'outline'}
              onClick={onTogglePassed}
              className="w-full"
            >
              {passed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  علامت‌گذاری شده به‌عنوان پاس‌شده
                </>
              ) : prereqsSatisfied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                  علامت پاس‌کردن این درس
                </>
              ) : (
                <>ابتدا پیش‌نیازها را پاس کنید</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
