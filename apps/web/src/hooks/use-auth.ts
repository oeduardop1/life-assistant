'use client';

import { useAuthContext, type AuthUser } from '@/contexts/auth-context';

/**
 * useAuth Hook
 *
 * Provides access to authentication state and methods.
 * This is a convenience wrapper around useAuthContext that maintains
 * backward compatibility with the previous interface.
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * if (isAuthenticated) {
 *   console.log(`Logged in as ${user?.email}`);
 * }
 * ```
 */
interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    signUp,
    resetPassword,
  } = useAuthContext();

  // Wrap methods to maintain backward compatibility
  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await signIn(email, password);
    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async (): Promise<void> => {
    await signOut();
  };

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    const { error } = await signUp(email, password, name);
    if (error) {
      throw new Error(error.message);
    }
  };

  const resetPasswordHandler = async (email: string): Promise<void> => {
    const { error } = await resetPassword(email);
    if (error) {
      throw new Error(error.message);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    signup,
    resetPassword: resetPasswordHandler,
  };
}
