'use client';

import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import type { AuthContextValue } from '@/types/auth';

/**
 * Hook for consuming auth state and actions from the AuthProvider.
 * Must be used within an AuthProvider.
 *
 * @returns AuthContextValue with user, isAuthenticated, isLoading, signIn, signUp, signOut, error
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, signIn, signOut } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
