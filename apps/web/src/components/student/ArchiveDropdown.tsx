'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Calendar } from 'lucide-react';
import { toShamsi } from '@/lib/shamsi-utils';

interface Props {
  /** Currently selected archive semester ID, or null for current */
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Archive Dropdown for the Dashboard (Golden Doc §2.1.1).
 * "Located at the top of the page. Allows students to switch the dashboard
 * view to display enrollments from past semesters (read-only mode)."
 */
export function ArchiveDropdown({ value, onChange }: Props) {
  const { data: semesters } = useQuery({
    queryKey: ['archive-semesters'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/semesters');
      return (r.data.data.semesters as Array<any>) || [];
    },
    retry: false,
  });

  return (
    <div className="flex items-center gap-2">
      <Archive className="h-4 w-4 text-muted-foreground" />
      <Select value={value || 'current'} onValueChange={(v) => onChange(v === 'current' ? null : v)}>
        <SelectTrigger className="w-48 md:w-64" aria-label="انتخاب نیم‌سال">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              نیم‌سال جاری
            </div>
          </SelectItem>
          {(semesters || [])
            .filter((s: any) => !s.isCurrent)
            .map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} (آرشیو)
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
