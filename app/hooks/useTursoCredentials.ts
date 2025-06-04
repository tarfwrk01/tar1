import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { TursoCredentials } from '../utils/credentialCache';
import { getProfileData } from '../utils/tursoDb';

interface UseTursoCredentialsResult {
  credentials: TursoCredentials | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasCached: boolean;
}

/**
 * React hook for accessing Turso database credentials with InstantDB-first approach
 * Automatically fetches credentials when user is available
 * Caches credentials after fetching from InstantDB for better performance
 */
export const useTursoCredentials = (): UseTursoCredentialsResult => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<TursoCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCached, setHasCached] = useState(false);

  const fetchCredentials = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id) {
      setCredentials(null);
      setError('No authenticated user');
      setHasCached(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get cached credentials (for existing users after sign in)
      const { tursoDbName, tursoApiToken } = await getProfileData(user.id, forceRefresh);

      const credentials: TursoCredentials = {
        tursoDbName,
        tursoApiToken,
        userId: user.id
      };

      setCredentials(credentials);
      setHasCached(true); // These came from cache
      console.log('[useTursoCredentials] Credentials loaded from cache');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch credentials';
      setError(errorMessage);
      setCredentials(null);
      setHasCached(false);
      console.error('[useTursoCredentials] Error fetching credentials:', err);

      // If credentials are not cached yet, this is expected for new users or users who just signed in
      // The onboarding context will handle caching after authentication
      if (errorMessage.includes('No cached credentials found')) {
        console.log('[useTursoCredentials] No cached credentials - user may need to complete onboarding or wait for cache');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refetch function that forces a refresh
  const refetch = useCallback(async () => {
    await fetchCredentials(true);
  }, [fetchCredentials]);

  // Auto-fetch credentials when user changes
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return {
    credentials,
    isLoading,
    error,
    refetch,
    hasCached
  };
};

/**
 * Hook variant that only returns credentials when they're available
 * Useful for components that need to wait for credentials before rendering
 */
export const useTursoCredentialsRequired = (): {
  credentials: TursoCredentials;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasCached: boolean;
} | null => {
  const result = useTursoCredentials();
  
  if (!result.credentials) {
    return null;
  }

  return {
    ...result,
    credentials: result.credentials
  };
};

/**
 * Hook that provides a function to get credentials on-demand
 * Useful for components that don't need credentials immediately
 */
export const useTursoCredentialsLazy = () => {
  const { user } = useAuth();

  const getCredentials = useCallback(async (forceRefresh: boolean = false): Promise<TursoCredentials> => {
    if (!user?.id) {
      throw new Error('No authenticated user');
    }

    // Get cached credentials (for existing users after sign in)
    const { tursoDbName, tursoApiToken } = await getProfileData(user.id, forceRefresh);

    const credentials = {
      tursoDbName,
      tursoApiToken,
      userId: user.id
    };

    console.log('[useTursoCredentialsLazy] Credentials loaded from cache');
    return credentials;
  }, [user?.id]);

  return { getCredentials };
};
