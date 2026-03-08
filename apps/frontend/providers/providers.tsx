'use client';

import { QueryProvider } from './query-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ApiErrorHandler } from './api-error-handler';
import { LanguageProvider } from '@/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <QueryProvider>
        <ToastProvider>
          <ApiErrorHandler />
          {children}
        </ToastProvider>
      </QueryProvider>
    </LanguageProvider>
  );
}
