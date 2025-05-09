import '@/polyfills';
import { Stack } from 'expo-router';
import { AuthProvider } from './context/auth';
import { OnboardingProvider } from './context/onboarding';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingProvider>
    </AuthProvider>
  );
}
