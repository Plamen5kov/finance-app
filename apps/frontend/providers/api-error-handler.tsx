'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export function ApiErrorHandler() {
  const { showToast } = useToast();

  useEffect(() => {
    function handleForbidden(e: Event) {
      const message = (e as CustomEvent).detail || 'You do not have permission to perform this action';
      showToast(message, 'error');
    }

    window.addEventListener('api:forbidden', handleForbidden);
    return () => window.removeEventListener('api:forbidden', handleForbidden);
  }, [showToast]);

  return null;
}
