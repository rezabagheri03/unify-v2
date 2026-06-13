'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Palette } from 'lucide-react';
import { CARD_COLORS } from '@unify/shared-types';

interface Props {
  enrollmentId: string;
  currentColor: string;
  onChange: (color: string) => void;
}

export function CardColorPicker({ enrollmentId: _enrollmentId, currentColor, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="تغییر رنگ کارت">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>انتخاب رنگ کارت</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 pt-3">
          {CARD_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                onChange(c.value);
                setOpen(false);
              }}
              className={`h-14 rounded-md flex items-center justify-center text-xs font-medium transition-transform hover:scale-110 ${
                currentColor === c.value ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              style={{ backgroundColor: c.value, color: '#fff' }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
