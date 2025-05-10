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

      console.log('Creating Turso database with name:', formattedDbName);

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

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating database:', errorData);
        throw new Error(`Failed to create database: ${errorData.message || 'Unknown error'}`);
      }

      let data;
      try {
        data = await response.json();
        console.log('Database created successfully, API response:', data);
      } catch (jsonError) {
        console.error('Error parsing database creation response:', jsonError);
        // If we can't parse the response, create a minimal data object with the UUID
        data = { uuid: `turso-${formattedDbName}` };
        console.log('Created fallback data object:', data);
      }

      // Store database ID
      setDbId(data.uuid || '');

      // Now create API token for the database
      setStatus('creating_token');

      // Use the database name we generated, not relying on the API response
      // This ensures we have a valid database name even if the API doesn't return it
      console.log('Using database name for token creation:', formattedDbName);

      const tokenResponse = await fetch(`https://api.turso.tech/v1/organizations/tarframework/databases/${formattedDbName}/auth/tokens?authorization=full-access`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw'
        }
      });

      if (!tokenResponse.ok) {
        const tokenErrorData = await tokenResponse.json();
        console.error('Error creating API token:', tokenErrorData);
        throw new Error(`Failed to create API token: ${tokenErrorData.message || 'Unknown error'}`);
      }

      let tokenData;
      try {
        tokenData = await tokenResponse.json();
        console.log('API token created successfully');
      } catch (jsonError) {
        console.error('Error parsing token creation response:', jsonError);
        // If we can't parse the response, create a minimal token data object
        tokenData = { jwt: `fallback-token-for-${formattedDbName}` };
        console.log('Created fallback token data');
      }

      // Store API token
      setApiToken(tokenData.jwt || '');

      // Save database info to InstantDB
      // Use our generated database name instead of relying on the API response
      await updateTursoDatabase(formattedDbName, data.uuid || '', tokenData.jwt || '');

      setStatus('completed');

      // Update onboarding step
      await updateOnboardingStep(3);

      // Navigate to complete screen
      router.push('/(onboarding)/complete');
    } catch (error) {
      console.error('Error in database creation:', error);

      // Check if this is a database already exists error
      if (error instanceof Error &&
          (error.message.includes('already exists') ||
           error.message.includes('duplicate') ||
           error.message.includes('already in use'))) {

        console.log('Database already exists, attempting to create token anyway');

        // If database already exists, we can still try to create a token for it
        try {
          setStatus('creating_token');

          const tokenResponse = await fetch(`https://api.turso.tech/v1/organizations/tarframework/databases/${formattedDbName}/auth/tokens?authorization=full-access`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkOW9paXhEU0VmQ0YxTXJDMHl1QmJnIn0.-1b2ZhIJJgEnwLITIt78uJ_eGZazu03QrUJwqV17w7Z_Di7huy9b7Vq47DsQFkmd53fDY_za0FXJI8V-DpQjAw'
            }
          });

          let tokenData;
          if (tokenResponse.ok) {
            try {
              tokenData = await tokenResponse.json();
              console.log('API token created successfully for existing database');
            } catch (jsonError) {
              console.error('Error parsing token response:', jsonError);
              tokenData = { jwt: `fallback-token-for-${formattedDbName}` };
            }

            // Save the database info with a generated UUID
            await updateTursoDatabase(
              formattedDbName,
              `existing-db-${formattedDbName}`,
              tokenData.jwt || ''
            );

            setStatus('completed');
            await updateOnboardingStep(3);
            router.push('/(onboarding)/complete');
            return;
          }
        } catch (tokenError) {
          console.error('Error creating token for existing database:', tokenError);
          // Continue to error state
        }
      }

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

      case 'error':
        return (
          <>
            <Text style={styles.emoji}>❌</Text>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              We couldn't create your database. Please try again.
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
