import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';
import { useOnboarding } from '../context/onboarding';

export default function CommerceAgentScreen() {
  const { ensureMemoriesTable } = useOnboarding();

  // Ensure required database tables exist when component mounts
  useEffect(() => {
    const initializeCommerceAgent = async () => {
      console.log('Initializing commerce agent...');
      try {
        // Ensure the required database tables exist
        await ensureMemoriesTable();
        console.log('Commerce agent initialization complete');
      } catch (error) {
        console.error('Error initializing commerce agent:', error);
      }
    };

    initializeCommerceAgent();
  }, [ensureMemoriesTable]);

  const handleInitiateCommerce = () => {
    console.log('Initiating commerce modules...');
    // Add commerce module initialization logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Commerce Agent" />
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleInitiateCommerce}
        >
          <Text style={styles.buttonText}>Initiate Commerce Modules</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
