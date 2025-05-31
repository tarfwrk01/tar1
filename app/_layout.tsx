import '@/polyfills';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from './context/auth';
import { OnboardingProvider } from './context/onboarding';
import { ProductProvider } from './context/product';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Hide the splash screen immediately when this component mounts
  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync();

    // Set navigation bar background to black on Android
    if (Platform.OS === 'android') {
      try {
        // Try expo-navigation-bar first
        const NavigationBar = require('expo-navigation-bar');
        NavigationBar.setBackgroundColorAsync('#000000');

        // Also try SystemUI as fallback
        SystemUI.setBackgroundColorAsync('#000000');
      } catch (error) {
        console.log('Navigation bar styling not available in development:', error);
      }
    }
  }, []);

  return (
    <AuthProvider>
      <OnboardingProvider>
        <ProductProvider>
          {/* Global StatusBar configuration */}
          <StatusBar style="dark" backgroundColor="#000000" translucent />
          <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none'
          }}
          initialRouteName="index"
        >
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(agents)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(primary)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(settings)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false, animation: 'none' }} />
        </Stack>
        </ProductProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
