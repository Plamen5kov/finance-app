'use client';

import { QueryProvider } from './query-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ApiErrorHandler } from './api-error-handler';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ApiErrorHandler />
        {children}
      </ToastProvider>
    </QueryProvider>
  );
}
