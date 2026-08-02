'use client';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

/**
 * Hook that gates protected actions behind authentication.
 * Shows a toast warning if the user is unauthenticated.
 */
export function useAuthGate() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const guardAction = useCallback(
    (action: () => void | Promise<void>) => {
      if (!isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: 'Please login or sign up to use this feature',
          variant: 'destructive',
        });
        return;
      }
      action();
    },
    [isAuthenticated, toast]
  );

  return { guardAction, isAuthenticated };
}
