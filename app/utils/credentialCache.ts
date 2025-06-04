import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const CACHE_KEY = 'turso_credentials';
// Cache persists until logout - no time-based expiration

// Types
export interface TursoCredentials {
  tursoDbName: string;
  tursoApiToken: string;
  userId: string;
}

interface CachedCredentials extends TursoCredentials {
  timestamp: number;
  // No expiration - cache persists until logout
}

/**
 * Stores Turso credentials in AsyncStorage with timestamp
 * @param credentials - The credentials to cache
 */
export const cacheCredentials = async (credentials: TursoCredentials): Promise<void> => {
  try {
    const now = Date.now();

    const cachedData: CachedCredentials = {
      ...credentials,
      timestamp: now
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    console.log('[CredentialCache] Credentials cached successfully');
  } catch (error) {
    console.error('[CredentialCache] Error caching credentials:', error);
    // Don't throw error - caching failure shouldn't break the app
  }
};

/**
 * Retrieves cached credentials if they exist and are valid
 * @param userId - The user ID to validate against cached credentials
 * @returns Cached credentials or null if not found/invalid
 */
export const getCachedCredentials = async (userId: string): Promise<TursoCredentials | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);

    if (!cachedData) {
      console.log('[CredentialCache] No cached credentials found');
      return null;
    }

    const parsed: CachedCredentials = JSON.parse(cachedData);

    // Check if userId matches (security check)
    if (parsed.userId !== userId) {
      console.log('[CredentialCache] UserId mismatch, clearing cache');
      await clearCredentialCache();
      return null;
    }

    console.log('[CredentialCache] Valid cached credentials found');
    return {
      tursoDbName: parsed.tursoDbName,
      tursoApiToken: parsed.tursoApiToken,
      userId: parsed.userId
    };
  } catch (error) {
    console.error('[CredentialCache] Error retrieving cached credentials:', error);
    // Clear potentially corrupted cache
    await clearCredentialCache();
    return null;
  }
};

/**
 * Clears cached credentials from AsyncStorage
 */
export const clearCredentialCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('[CredentialCache] Credential cache cleared');
  } catch (error) {
    console.error('[CredentialCache] Error clearing credential cache:', error);
  }
};

/**
 * Checks if credentials are cached and valid for a given user
 * @param userId - The user ID to check
 * @returns True if valid cached credentials exist
 */
export const hasCachedCredentials = async (userId: string): Promise<boolean> => {
  const cached = await getCachedCredentials(userId);
  return cached !== null;
};

/**
 * Gets cache info for debugging purposes
 * @returns Cache information or null if no cache exists
 */
export const getCacheInfo = async (): Promise<{
  exists: boolean;
  timestamp?: number;
  userId?: string;
} | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);

    if (!cachedData) {
      return { exists: false };
    }

    const parsed: CachedCredentials = JSON.parse(cachedData);

    return {
      exists: true,
      timestamp: parsed.timestamp,
      userId: parsed.userId
    };
  } catch (error) {
    console.error('[CredentialCache] Error getting cache info:', error);
    return null;
  }
};
