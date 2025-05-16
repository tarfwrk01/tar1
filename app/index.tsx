import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
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

      // For new users or users who haven't completed onboarding, go to database screen
      // Only users with isOnboardingCompleted === true should go to primary
      if (isOnboardingCompleted !== true) {
        console.log('Root index - User not onboarded, navigating directly to database screen in useEffect');
        navigationInProgress.current = true;
        setTimeout(() => {
          router.replace('/(onboarding)/database');
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

  // Custom splash screen with the icon.png image
  const renderSplashScreen = () => {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>tar</Text>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#666"
            style={styles.loader}
          />
        )}
      </View>
    );
  };

  // Show splash screen while checking auth state and onboarding status
  if (isLoading) {
    console.log('Root index - Still loading, showing splash screen');
    return renderSplashScreen();
  }

  // Just return the splash screen - navigation is handled in useEffect
  console.log('Root index - Rendering splash screen while navigation happens');
  return renderSplashScreen();
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: 200,
    height: 200,
  },
  appName: {
    marginTop: 20,
    fontSize: 24,
    color: '#333',
  },
  loader: {
    marginTop: 30,
  }
});