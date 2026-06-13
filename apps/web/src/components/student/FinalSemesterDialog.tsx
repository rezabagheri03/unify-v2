'use client';

import { useState } from 'react';
import { AcademicStatus, PERSIAN_STATUS_NAMES } from '@unify/shared-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pendingValue: AcademicStatus;
}

/**
 * Final Semester confirmation dialog (Golden Doc §2.2.1):
 * "When a student selects 'Final Semester,' display a confirmation dialog
 * explaining the conflict-ignore rule."
 */
export function FinalSemesterDialog({ open, onOpenChange, onConfirm, pendingValue }: Props) {
  const isFinalSemester = pendingValue === AcademicStatus.FINAL_SEMESTER;
  if (!isFinalSemester) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            تأیید وضعیت «ترم آخر»
          </DialogTitle>
          <DialogDescription>
            <p className="mb-3">
              با انتخاب وضعیت <strong>{PERSIAN_STATUS_NAMES[AcademicStatus.FINAL_SEMESTER]}</strong>،
              قوانین زیر اعمال می‌شوند:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <span>حداکثر واحد قابل ثبت‌نام: <strong>۲۴ واحد</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <span>
                  <strong>تعارضات زمانی کلاس</strong> نادیده گرفته می‌شوند (هشدار به جای خطا)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <span>
                  <strong>تعارضات زمان امتحان</strong> نادیده گرفته می‌شوند
                </span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              ⚠️ مسئولیت انتخاب درس‌های متعارض بر عهده خودتان است.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            بله، تأیید می‌کنم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
