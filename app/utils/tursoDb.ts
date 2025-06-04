import {
    cacheCredentials,
    getCachedCredentials,
    TursoCredentials
} from './credentialCache';

/**
 * Gets profile data from cache or throws error (cache-dependent approach)
 * This function is used by hooks that need credentials but should rely on the onboarding context
 * for the actual InstantDB queries. For existing users, credentials should be cached after sign in.
 * @param userId - The user ID to get profile data for
 * @param forceRefresh - Whether to force a fresh query (ignored, uses cache only)
 * @returns Promise<{tursoDbName: string, tursoApiToken: string}>
 */
export const getProfileData = async (userId: string, forceRefresh: boolean = false): Promise<{tursoDbName: string, tursoApiToken: string}> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  console.log('[TursoDb] Checking cached credentials for user:', userId);

  try {
    // Try to get cached credentials first
    const cached = await getCachedCredentials(userId);
    if (cached && cached.tursoDbName && cached.tursoApiToken) {
      console.log('[TursoDb] Using cached credentials');
      return {
        tursoDbName: cached.tursoDbName,
        tursoApiToken: cached.tursoApiToken
      };
    }

    // If no cache, throw error - the onboarding context should handle InstantDB queries
    throw new Error('No cached credentials found. Please ensure user is properly authenticated and onboarded.');
  } catch (error) {
    console.error('[TursoDb] Error getting profile data:', error);
    throw error;
  }
};

/**
 * Gets cached credentials for a user
 * @param userId - The user ID to get cached credentials for
 * @returns Promise<{tursoDbName: string, tursoApiToken: string} | null>
 */
export const getCachedTursoCredentials = async (userId: string): Promise<{tursoDbName: string, tursoApiToken: string} | null> => {
  if (!userId) {
    return null;
  }

  const cachedCredentials = await getCachedCredentials(userId);
  if (cachedCredentials) {
    console.log('[TursoDb] Using cached credentials');
    return {
      tursoDbName: cachedCredentials.tursoDbName,
      tursoApiToken: cachedCredentials.tursoApiToken
    };
  }

  return null;
};

/**
 * Caches credentials from profile data
 * @param userId - The user ID
 * @param profileData - The profile data from onboarding context
 * @returns Promise<{tursoDbName: string, tursoApiToken: string}>
 */
export const cacheAndGetCredentials = async (userId: string, profileData: any): Promise<{tursoDbName: string, tursoApiToken: string}> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!profileData?.profile?.[0]) {
    throw new Error('Profile data is required');
  }

  const profile = profileData.profile[0];
  const { tursoDbName, tursoApiToken } = profile;

  if (!tursoDbName || !tursoApiToken) {
    throw new Error('Missing database credentials in profile data');
  }

  // Cache the credentials
  const credentialsToCache: TursoCredentials = {
    tursoDbName,
    tursoApiToken,
    userId
  };

  await cacheCredentials(credentialsToCache);
  console.log('[TursoDb] Credentials cached successfully');

  return { tursoDbName, tursoApiToken };
};

/**
 * Gets credentials with cache-first approach
 * @param userId - The user ID
 * @param profileData - The profile data from onboarding context (fallback)
 * @returns Promise<{tursoDbName: string, tursoApiToken: string}>
 */
export const getCredentialsWithCache = async (userId: string, profileData: any): Promise<{tursoDbName: string, tursoApiToken: string}> => {
  // Try cache first
  const cached = await getCachedTursoCredentials(userId);
  if (cached) {
    return cached;
  }

  // Fallback to profile data and cache it
  return await cacheAndGetCredentials(userId, profileData);
};

/**
 * Creates a table in Turso database
 * @param {string} tableName - Name of the table to create
 * @param {string} createTableSQL - SQL statement to create the table
 * @param {Object} tableConfig - Configuration to store in tableconfig
 * @param {string} userId - The user ID to get credentials for
 * @param {any} profileData - The profile data from onboarding context
 * @returns {Promise<boolean>} - Success status
 */
export const createTursoTable = async (tableName: string, createTableSQL: string, tableConfig: any, userId: string, profileData?: any): Promise<boolean> => {
  try {
    // Get database credentials (using cache when available)
    const { tursoDbName, tursoApiToken } = await getCredentialsWithCache(userId, profileData);

    // Construct API URL
    const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

    // Step 1: Register schema in tableconfig
    const configResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `INSERT OR REPLACE INTO tableconfig (name, config) VALUES (?, ?)`,
              args: [tableName, JSON.stringify(tableConfig)]
            }
          }
        ]
      })
    });

    if (!configResponse.ok) {
      console.error(`Failed to register schema for ${tableName} in tableconfig:`, await configResponse.text());
      return false;
    }

    // Step 2: Create the table
    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: createTableSQL
            }
          }
        ]
      })
    });

    if (!createResponse.ok) {
      console.error(`Failed to create table ${tableName}:`, await createResponse.text());
      return false;
    }

    // Step 3: Verify table creation
    const verifyResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
              args: [tableName]
            }
          }
        ]
      })
    });

    if (!verifyResponse.ok) {
      console.error(`Failed to verify table ${tableName}:`, await verifyResponse.text());
      return false;
    }

    const verifyData = await verifyResponse.json();
    const tableExists = verifyData.results?.[0]?.rows?.length > 0;

    if (!tableExists) {
      console.error(`Table ${tableName} was not created successfully`);
      return false;
    }

    console.log(`Table ${tableName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    return false;
  }
};
