/**
 * useAuth Hook (Placeholder for M0.7)
 *
 * This is a placeholder implementation that will be replaced
 * in M0.7 when authentication is implemented.
 *
 * For now, it returns mock data to enable development of
 * authenticated pages.
 */

interface User {
  id: string;
  name: string;
  email: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  // TODO: Implement in M0.7
  // This will integrate with the backend auth system

  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: async () => {
      throw new Error('Auth not implemented yet (M0.7)');
    },
    logout: async () => {
      throw new Error('Auth not implemented yet (M0.7)');
    },
  };
}
