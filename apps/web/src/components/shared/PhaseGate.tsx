'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Phase } from '@unify/shared-types';
import { PERSIAN_PHASE_NAMES } from '@/lib/shamsi-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface Props {
  /** Current phase required to view the children */
  requiredPhase: Phase | Phase[];
  children: React.ReactNode;
  /** Optional title shown when access is denied */
  title?: string;
  /** Optional description */
  description?: string;
}

/**
 * Phase-specific UI gating — children only render if the current system phase
 * matches `requiredPhase`. Otherwise shows an "access denied in current phase" card.
 */
export function PhaseGate({ requiredPhase, children, title, description }: Props) {
  const { data: state, isLoading } = useQuery({
    queryKey: ['system-state'],
    queryFn: async () => (await apiClient.get('/system/state')).data.data,
  });

  if (isLoading) return null;

  const currentPhase = (state?.currentPhase || Phase.ENROLLMENT) as Phase;
  const allowed = Array.isArray(requiredPhase)
    ? requiredPhase.includes(currentPhase)
    : requiredPhase === currentPhase;

  if (allowed) return <>{children}</>;

  const phaseNames = Array.isArray(requiredPhase)
    ? requiredPhase.map((p) => PERSIAN_PHASE_NAMES[p]).join(' یا ')
    : PERSIAN_PHASE_NAMES[requiredPhase];

  return (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-yellow-600" />
          {title || 'این بخش در فاز فعلی در دسترس نیست'}
        </CardTitle>
        <CardDescription>
          {description || `این بخش فقط در فاز ${phaseNames} فعال است. فاز فعلی سیستم: ${PERSIAN_PHASE_NAMES[currentPhase]}.`}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
