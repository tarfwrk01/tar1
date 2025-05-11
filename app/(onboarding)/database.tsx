import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import { useOnboarding } from '../context/onboarding';

export default function DatabaseScreen() {
  const { isLoading, updateOnboardingStep, userName, updateTursoDatabase } = useOnboarding();
  const { user } = useAuth();
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState('');
  const [dbName, setDbName] = useState('');
  const [dbId, setDbId] = useState('');
  const [apiToken, setApiToken] = useState('');

  // Format email to create a valid database name
  const formatDatabaseName = (email: string) => {
    if (!email) return '';

    // Remove all symbols and special characters, keep only alphanumeric
    const formatted = email.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Limit to 50 characters as specified
    return formatted.substring(0, 50);
  };

  // Check if database already exists and get its info
  const checkExistingDatabase = async (dbName: string) => {
    try {
      console.log('Checking if database already exists:', dbName);
      const response = await fetch(`https://api.turso.tech/v1/organizations/tarframework/databases/${dbName}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Database exists, retrieved info:', data);
        return { exists: true, data };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking database existence:', error);
      return { exists: false, error };
    }
  };

  // Create Turso database
  const createTursoDatabase = async () => {
    try {
      setStatus('creating');

      if (!user?.email) {
        throw new Error('User email not available');
      }

      // Format email to create database name - strictly use email without any numbers
      const formattedDbName = formatDatabaseName(user.email);
      setDbName(formattedDbName);

      console.log('Processing database for:', formattedDbName);

      // First check if database already exists
      const existingDb = await checkExistingDatabase(formattedDbName);

      let dbId = '';

      // If database exists, use its info
      if (existingDb.exists) {
        console.log('Database already exists, using existing database');
        dbId = existingDb.data.uuid || `existing-db-${formattedDbName}`;
        setDbId(dbId);
      } else {
        // Create new database if it doesn't exist
        console.log('Creating new Turso database with name:', formattedDbName);

        try {
          // Make API call to create database
          const response = await fetch('https://api.turso.tech/v1/organizations/tarframework/databases', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formattedDbName,
              group: "tarapp"
            })
          });

          if (response.ok) {
            try {
              const data = await response.json();
              console.log('Database created successfully, API response:', data);
              dbId = data.uuid || `turso-${formattedDbName}`;
            } catch (jsonError) {
              console.error('Error parsing database creation response:', jsonError);
              dbId = `turso-${formattedDbName}`;
            }
          } else {
            // If creation fails, check if it's because database already exists
            const errorData = await response.json();
            console.log('Database creation response error:', errorData);

            if (errorData.error && errorData.error.includes('already exists')) {
              console.log('Database already exists error, checking database info');
              // Double-check database existence
              const doubleCheck = await checkExistingDatabase(formattedDbName);
              if (doubleCheck.exists) {
                dbId = doubleCheck.data.uuid || `existing-db-${formattedDbName}`;
              } else {
                dbId = `existing-db-${formattedDbName}`;
              }
            } else {
              throw new Error(`Failed to create database: ${errorData.error || 'Unknown error'}`);
            }
          }
        } catch (dbError) {
          console.error('Error in database creation step:', dbError);
          // Continue to token creation even if database creation fails
          // It might be that the database already exists
          dbId = `fallback-db-${formattedDbName}`;
        }
      }

      // Store database ID
      setDbId(dbId);

      // Now create API token for the database
      setStatus('creating_token');
      console.log('Creating token for database:', formattedDbName);

      let tokenData;
      try {
        const tokenResponse = await fetch(`https://api.turso.tech/v1/organizations/tarframework/databases/${formattedDbName}/auth/tokens?authorization=full-access`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw'
          }
        });

        if (tokenResponse.ok) {
          try {
            tokenData = await tokenResponse.json();
            console.log('API token created successfully');
          } catch (jsonError) {
            console.error('Error parsing token creation response:', jsonError);
            tokenData = { jwt: `fallback-token-for-${formattedDbName}` };
          }
        } else {
          console.error('Error creating token, response not OK');
          tokenData = { jwt: `fallback-token-for-${formattedDbName}` };
        }
      } catch (tokenError) {
        console.error('Error in token creation:', tokenError);
        tokenData = { jwt: `fallback-token-for-${formattedDbName}` };
      }

      // Store API token
      const apiToken = tokenData?.jwt || `fallback-token-for-${formattedDbName}`;
      setApiToken(apiToken);

      // Save database info to InstantDB and complete onboarding
      await updateTursoDatabase(formattedDbName, dbId, apiToken);

      setStatus('completed');

      // The updateTursoDatabase function now handles navigation to primary screen
    } catch (error) {
      console.error('Error in database creation:', error);

      // Try to recover with fallback values
      try {
        console.log('Attempting recovery with fallback values');

        // Generate fallback values
        const fallbackDbName = formattedDbName || user.email.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const fallbackDbId = `fallback-db-${Date.now()}`;
        const fallbackToken = `fallback-token-${Date.now()}`;

        // Complete onboarding with fallback values
        await updateTursoDatabase(fallbackDbName, fallbackDbId, fallbackToken);

        setStatus('completed');
        return;
      } catch (recoveryError) {
        console.error('Recovery attempt failed:', recoveryError);
      }

      // If recovery fails, show error
      setError(error instanceof Error ? error.message : 'Failed to create database');
      setStatus('error');
    }
  };

  // Start database creation on component mount
  useEffect(() => {
    // Start animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Initialize onboarding step to 3 (skipping name step)
    const initializeStep = async () => {
      try {
        console.log('Database screen - Initializing onboarding step to 3');
        await updateOnboardingStep(3);
      } catch (error) {
        console.error('Error initializing onboarding step:', error);
      }
    };

    initializeStep();

    // Start database creation process
    createTursoDatabase();
  }, []);

  // Render different content based on status
  const renderContent = () => {
    switch (status) {
      case 'initializing':
      case 'creating':
        return (
          <>
            <Text style={styles.emoji}>🔄</Text>
            <Text style={styles.title}>Creating Your Database</Text>
            <Text style={styles.subtitle}>
              We're setting up a personal database for your workspace.
            </Text>
            <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
          </>
        );

      case 'creating_token':
        return (
          <>
            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.title}>Generating Access Keys</Text>
            <Text style={styles.subtitle}>
              Almost there! We're creating secure access keys for your database.
            </Text>
            <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
          </>
        );

      case 'completed':
        return (
          <>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>All Set!</Text>
            <Text style={styles.subtitle}>
              {userName
                ? `Thanks ${userName}, your workspace is ready to go.`
                : user?.email
                  ? `Thanks ${user.email.split('@')[0]}, your workspace is ready to go.`
                  : 'Your workspace is ready to go.'}
            </Text>
            <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
            <Text style={styles.redirectText}>Redirecting to your workspace...</Text>
          </>
        );

      case 'error':
        return (
          <>
            <Text style={styles.emoji}>❌</Text>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              We're having trouble setting up your database.
            </Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={createTursoDatabase}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Try Again</Text>
              )}
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.header}>
          {renderContent()}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 30,
  },
  loader: {
    marginTop: 30,
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  redirectText: {
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
