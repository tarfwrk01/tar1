import '@/polyfills';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from './context/auth';
import { OnboardingProvider } from './context/onboarding';
import { ProductProvider } from './context/product';
import { setNavigationBarBlack } from './utils/navigationBarUtils';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Hide the splash screen immediately when this component mounts
  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync();

    // Set navigation bar background to black on Android
    setNavigationBarBlack();
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
