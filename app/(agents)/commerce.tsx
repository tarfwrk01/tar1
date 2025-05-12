import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';
import { useOnboarding } from '../context/onboarding';

export default function CommerceAgentScreen() {
  const { ensureMemoriesTable, isLoading } = useOnboarding();

  // Ensure required database tables exist when component mounts
  useEffect(() => {
    const initializeCommerceAgent = async () => {
      console.log('Initializing commerce agent...');
      try {
        // Ensure the required database tables exist (memories and tableconfig)
        await ensureMemoriesTable();
        console.log('Commerce agent initialization complete');
      } catch (error) {
        console.error('Error initializing commerce agent:', error);
      }
    };

    initializeCommerceAgent();
  }, [ensureMemoriesTable]);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Commerce Agent" />
      <View style={styles.content}>
        {isLoading ? (
          <>
            <Text style={styles.title}>Initializing Commerce Agent</Text>
            <Text style={styles.subtitle}>
              Setting up database tables for your commerce workspace...
            </Text>
            <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Commerce Agent</Text>
            <Text style={styles.subtitle}>
              This is the commerce agent interface.
            </Text>
          </>
        )}
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
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
});
