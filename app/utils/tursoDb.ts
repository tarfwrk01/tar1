import { instant } from '../../lib/instantdb';

/**
 * Gets the profile data with Turso database credentials
 * @param userId - The user ID to get profile data for
 * @returns Promise<{tursoDbName: string, tursoApiToken: string}>
 */
export const getProfileData = async (userId: string): Promise<{tursoDbName: string, tursoApiToken: string}> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Query the profile data
  const { data: profileData } = await instant.query({
    profile: {
      $: {
        where: { userId },
        fields: ['tursoDbName', 'tursoApiToken']
      }
    }
  });

  // Get the first profile
  const profile = profileData?.profile?.[0];

  if (!profile) {
    throw new Error('Profile not found');
  }

  const { tursoDbName, tursoApiToken } = profile;

  if (!tursoDbName || !tursoApiToken) {
    throw new Error('Missing database credentials');
  }

  return { tursoDbName, tursoApiToken };
};

/**
 * Creates a table in Turso database
 * @param {string} tableName - Name of the table to create
 * @param {string} createTableSQL - SQL statement to create the table
 * @param {Object} tableConfig - Configuration to store in tableconfig
 * @returns {Promise<boolean>} - Success status
 */
export const createTursoTable = async (tableName: string, createTableSQL: string, tableConfig: any): Promise<boolean> => {
  try {
    // Get database credentials
    const { tursoDbName, tursoApiToken } = await getProfileData();

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
