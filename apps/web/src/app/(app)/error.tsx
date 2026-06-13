'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * In-app error boundary for the (app) layout.
 * Does NOT include the full <html> tag (parent layout provides it).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-center">خطا در بارگذاری صفحه</CardTitle>
          <CardDescription className="text-center">
            این صفحه با خطا مواجه شد. لطفاً دوباره تلاش کنید یا به صفحه دیگری بروید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {error.digest && (
            <p className="text-xs text-center text-muted-foreground persian-numerals">
              کد خطا: {error.digest}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={() => reset()}>
              <RefreshCw className="h-4 w-4 ml-1" />
              تلاش مجدد
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">بازگشت</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
