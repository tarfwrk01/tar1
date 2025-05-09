import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from './context/auth';
import { useOnboarding } from './context/onboarding';

export default function Index() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding();
  const navigationInProgress = useRef(false);

  const isLoading = authLoading || onboardingLoading;

  // Add detailed logging to help debug
  useEffect(() => {
    console.log('Root index - authLoading:', authLoading, 'onboardingLoading:', onboardingLoading);
    console.log('Root index - user:', user?.id, 'isOnboardingCompleted:', isOnboardingCompleted);

    // Prevent multiple navigations
    if (navigationInProgress.current) {
      console.log('Root index - Navigation already in progress, skipping');
      return;
    }

    // Log when the component is first mounted
    if (!isLoading && user) {
      console.log('Root index - Ready to redirect, user authenticated');

      // For returning users, always assume they've completed onboarding
      // This prevents the flash of onboarding screen
      if (isOnboardingCompleted === false) {
        console.log('Root index - User not onboarded, navigating to welcome in useEffect');
        navigationInProgress.current = true;
        setTimeout(() => {
          router.replace('/(onboarding)/welcome');
        }, 100);
      } else {
        console.log('Root index - User onboarded, navigating to primary in useEffect');
        navigationInProgress.current = true;
        setTimeout(() => {
          router.replace('/(primary)');
        }, 100);
      }
    } else if (!isLoading && !user) {
      console.log('Root index - No user, navigating to login in useEffect');
      navigationInProgress.current = true;
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100);
    }
  }, [authLoading, onboardingLoading, user, isOnboardingCompleted, isLoading, router]);

  // Show loading indicator while checking auth state and onboarding status
  if (isLoading) {
    console.log('Root index - Still loading, showing loading indicator');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 20, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  // Just return a loading view - navigation is handled in useEffect
  console.log('Root index - Rendering loading view while navigation happens');
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color="#0066CC" />
    </View>
  );
}
