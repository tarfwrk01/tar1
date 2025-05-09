import React, { useEffect } from 'react';
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

export default function CompleteScreen() {
  const { isLoading, completeOnboarding, userName } = useOnboarding();
  const { user } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Log the userName from context
  useEffect(() => {
    console.log('Complete screen - userName from context:', userName);
  }, [userName]);

  React.useEffect(() => {
    // Reduce animation duration for a faster experience
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300, // Reduced from 800ms to 300ms for faster animation
      useNativeDriver: true,
    }).start();
  }, []);

  const handleFinish = async () => {
    console.log('Finish button pressed');
    try {
      await completeOnboarding();
      console.log('Onboarding completed successfully');
      // The onboarding context will handle navigation
    } catch (error) {
      console.error('Error completing onboarding:', error);
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
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            {userName ? `Thanks ${userName}, your workspace is ready to go.` : 'Your workspace is ready to go.'}
          </Text>
        </View>

        <Text style={styles.infoText}>
          Your workspace is now ready. You can chat with AI, manage tasks, and collaborate with your team.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleFinish}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginVertical: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
