'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SocketBootstrap } from '@/components/shared/SocketBootstrap';
import { SkipToMain } from '@/components/shared/SkipToMain';
import { KeyboardShortcuts } from '@/components/shared/KeyboardShortcuts';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SkipToMain />
      <KeyboardShortcuts />
      <SocketBootstrap />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
