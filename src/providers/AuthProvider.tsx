'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { amplifyConfig } from '@/lib/auth/amplify-config';
import type {
  AuthContextValue,
  AuthState,
  AuthUser,
  LockoutState,
  SignInInput,
  SignUpInput,
} from '@/types/auth';
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  TOKEN_REFRESH_TIMEOUT_MS,
} from '@/types/auth';

// Configure Amplify once at module level
Amplify.configure(amplifyConfig, { ssr: true });

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [lockoutState, setLockoutState] = useState<LockoutState>({
    failedAttempts: 0,
    lockedUntil: null,
  });

  const tokenRefreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if account is currently locked out
  const isLockedOut = useCallback((): boolean => {
    if (!lockoutState.lockedUntil) return false;
    if (Date.now() >= lockoutState.lockedUntil) {
      // Lockout expired, reset
      setLockoutState({ failedAttempts: 0, lockedUntil: null });
      return false;
    }
    return true;
  }, [lockoutState.lockedUntil]);

  // Get remaining lockout time in minutes
  const getRemainingLockoutMinutes = useCallback((): number => {
    if (!lockoutState.lockedUntil) return 0;
    return Math.ceil((lockoutState.lockedUntil - Date.now()) / 60000);
  }, [lockoutState.lockedUntil]);

  // Map Amplify user to our AuthUser type
  const mapToAuthUser = useCallback(
    async (amplifyUser: Awaited<ReturnType<typeof getCurrentUser>>): Promise<AuthUser> => {
      let email = '';
      let name: string | undefined;
      let picture: string | undefined;
      let emailVerified = false;
      let provider: AuthUser['provider'] = 'email';

      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        if (idToken) {
          const payload = idToken.payload;
          email = (payload['email'] as string) || '';
          name = (payload['name'] as string) || undefined;
          picture = (payload['picture'] as string) || undefined;
          emailVerified = (payload['email_verified'] as boolean) || false;

          // Detect social provider from identities claim
          const identities = payload['identities'] as
            | Array<{ providerName?: string }>
            | undefined;
          if (identities && identities.length > 0) {
            const providerName = identities[0].providerName?.toLowerCase();
            if (providerName === 'google') provider = 'google';
            else if (providerName === 'github') provider = 'github';
          }
        }
      } catch {
        // Session fetch may fail for newly signed up users
      }

      return {
        id: amplifyUser.userId,
        email,
        name,
        picture,
        emailVerified,
        provider,
        createdAt: new Date().toISOString(),
      };
    },
    []
  );

  // Silent token refresh with 5-second timeout
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshPromise = fetchAuthSession({ forceRefresh: true });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Token refresh timeout')),
          TOKEN_REFRESH_TIMEOUT_MS
        )
      );

      await Promise.race([refreshPromise, timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Set up periodic token refresh check
  const startTokenRefreshMonitor = useCallback(() => {
    if (tokenRefreshTimer.current) {
      clearInterval(tokenRefreshTimer.current);
    }

    // Check token expiry every 60 seconds
    tokenRefreshTimer.current = setInterval(async () => {
      try {
        const session = await fetchAuthSession();
        const expiresAt = session.tokens?.accessToken?.payload?.exp;
        if (expiresAt) {
          const expiryTime = expiresAt * 1000;
          const timeUntilExpiry = expiryTime - Date.now();

          // Refresh if token expires within 5 minutes
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            const success = await refreshToken();
            if (!success) {
              // Refresh failed, redirect to login
              setAuthState((prev) => ({
                ...prev,
                user: null,
                isAuthenticated: false,
                error: {
                  code: 'TOKEN_REFRESH_FAILED',
                  message:
                    'Session expired. Please sign in again.',
                },
              }));
              // Stop the monitor inline
              if (tokenRefreshTimer.current) {
                clearInterval(tokenRefreshTimer.current);
                tokenRefreshTimer.current = null;
              }
            }
          }
        }
      } catch {
        // Silent failure for monitoring
      }
    }, 60000);
  }, [refreshToken]);

  const stopTokenRefreshMonitor = useCallback(() => {
    if (tokenRefreshTimer.current) {
      clearInterval(tokenRefreshTimer.current);
      tokenRefreshTimer.current = null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        const authUser = await mapToAuthUser(currentUser);
        setAuthState({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        startTokenRefreshMonitor();
      } catch {
        // No current user session
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();

    return () => {
      stopTokenRefreshMonitor();
    };
  }, [mapToAuthUser, startTokenRefreshMonitor, stopTokenRefreshMonitor]);

  // Sign in with email/password
  const signIn = useCallback(
    async (input: SignInInput): Promise<void> => {
      // Check lockout before attempting
      if (isLockedOut()) {
        const remaining = getRemainingLockoutMinutes();
        setAuthState((prev) => ({
          ...prev,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account is temporarily locked. Please try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
          },
        }));
        return;
      }

      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await amplifySignIn({
          username: input.email,
          password: input.password,
        });

        if (result.isSignedIn) {
          const currentUser = await getCurrentUser();
          const authUser = await mapToAuthUser(currentUser);

          // Reset failed attempts on successful login
          setLockoutState({ failedAttempts: 0, lockedUntil: null });

          setAuthState({
            user: authUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          startTokenRefreshMonitor();
        } else {
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Additional steps required to complete sign-in.',
            },
          }));
        }
      } catch {
        // Increment failed attempts
        const newAttempts = lockoutState.failedAttempts + 1;

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          // Lock account for 15 minutes
          const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          setLockoutState({ failedAttempts: newAttempts, lockedUntil });
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              code: 'ACCOUNT_LOCKED',
              message:
                'Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.',
            },
          }));
        } else {
          setLockoutState((prev) => ({
            ...prev,
            failedAttempts: newAttempts,
          }));
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'The credentials you provided are incorrect. Please try again.',
            },
          }));
        }
      }
    },
    [
      isLockedOut,
      getRemainingLockoutMinutes,
      lockoutState.failedAttempts,
      mapToAuthUser,
      startTokenRefreshMonitor,
    ]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (input: SignUpInput): Promise<void> => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await amplifySignUp({
          username: input.email,
          password: input.password,
          options: {
            userAttributes: {
              email: input.email,
              ...(input.name ? { name: input.name } : {}),
            },
          },
        });

        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Sign up failed. Please try again.';
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'SIGNUP_FAILED',
            message: errorMessage,
          },
        }));
      }
    },
    []
  );

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await amplifySignOut();
      stopTokenRefreshMonitor();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Sign out failed. Please try again.';
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'SIGNOUT_FAILED',
          message: errorMessage,
        },
      }));
    }
  }, [stopTokenRefreshMonitor]);

  // Sign in with social provider (Google or GitHub)
  const signInWithProvider = useCallback(
    async (provider: 'google' | 'github'): Promise<void> => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const providerMap = {
          google: 'Google' as const,
          github: 'GitHub' as unknown as 'Google',
        };

        await signInWithRedirect({
          provider: providerMap[provider],
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Sign in with ${provider} failed. Please try again.`;
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: errorMessage,
          },
        }));
      }
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const contextValue: AuthContextValue = useMemo(
    () => ({
      ...authState,
      signIn,
      signUp,
      signOut,
      signInWithProvider,
      clearError,
    }),
    [authState, signIn, signUp, signOut, signInWithProvider, clearError]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
