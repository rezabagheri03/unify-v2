'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

/**
 * Next.js App Router error boundary.
 * Catches unhandled errors in any page or layout.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-center">خطای غیرمنتظره</CardTitle>
              <CardDescription className="text-center">
                سامانه با خطا مواجه شد. لطفاً دوباره تلاش کنید.
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
                  <Link href="/">
                    <Home className="h-4 w-4 ml-1" />
                    خانه
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
