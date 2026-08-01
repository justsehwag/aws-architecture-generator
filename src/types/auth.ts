/**
 * Authentication types for AWS Cognito integration.
 * Validates: Requirements 9.1, 9.4, 9.5, 9.6
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  provider: AuthProvider;
  createdAt: string;
}

export type AuthProvider = 'email' | 'google' | 'github';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REFRESH_FAILED'
  | 'SIGNUP_FAILED'
  | 'SIGNOUT_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  clearError: () => void;
}

export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const TOKEN_REFRESH_TIMEOUT_MS = 5000; // 5 seconds
