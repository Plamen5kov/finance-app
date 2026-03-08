'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/i18n';

export function ApiErrorHandler() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    function handleForbidden(e: Event) {
      const message = (e as CustomEvent).detail || t('permission.denied');
      showToast(message, 'error');
    }

    window.addEventListener('api:forbidden', handleForbidden);
    return () => window.removeEventListener('api:forbidden', handleForbidden);
  }, [showToast, t]);

  return null;
}
