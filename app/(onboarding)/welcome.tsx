import { useRouter } from 'expo-router';
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

export default function WelcomeScreen() {
  const { isLoading, updateOnboardingStep, currentStep } = useOnboarding();
  const { user } = useAuth();
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Add logging to help debug
  useEffect(() => {
    console.log('Welcome screen - user:', user?.id, 'currentStep:', currentStep, 'isLoading:', isLoading);
  }, [user, currentStep, isLoading]);

  React.useEffect(() => {
    // Reduce animation duration for a faster experience
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300, // Reduced from 1000ms to 300ms for faster animation
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGetStarted = async () => {
    console.log('Get Started button pressed');
    try {
      await updateOnboardingStep(1);
      console.log('Onboarding step updated to 1, navigating to name screen');
      router.push('/(onboarding)/name');
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  // Show a loading indicator if we're still initializing
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Setting up your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Let's set up your workspace in just a few steps.
          </Text>
        </View>

        <Text style={styles.infoText}>
          We'll help you get started with a personalized experience.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
