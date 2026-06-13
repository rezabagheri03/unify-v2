'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, Home } from 'lucide-react';

/**
 * 404 page (Next.js App Router).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <Compass className="h-9 w-9 text-muted-foreground" />
          </div>
          <CardTitle className="text-center text-3xl">۴۰۴</CardTitle>
          <CardDescription className="text-center">
            صفحه‌ای که جستجو می‌کردید یافت نشد.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-2">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 ml-1" />
              بازگشت به خانه
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
