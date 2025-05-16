import '@/polyfills';
import { Stack } from 'expo-router';
import { AuthProvider } from './context/auth';
import { OnboardingProvider } from './context/onboarding';
import { ProductProvider } from './context/product';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <ProductProvider>
          <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none'
          }}
          initialRouteName="index"
        >
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(agents)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(app)" options={{ headerShown: false, animation: 'none' }} />
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
