import '@/polyfills';
import { Stack } from 'expo-router';
import { AuthProvider } from './context/auth';

export default function RootLayout() {
  // Skip the initial delay and render the auth provider directly
  console.log('Root layout rendering auth provider');
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
