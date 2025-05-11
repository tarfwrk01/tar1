import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/auth';
import { useOnboarding } from '../context/onboarding';

export default function Index() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding();

  const isLoading = authLoading || onboardingLoading;

  // If still loading, show a loading indicator
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If onboarding is not completed or undefined (new user), redirect to database screen
  if (isOnboardingCompleted === false || isOnboardingCompleted === undefined) {
    return <Redirect href="/(onboarding)/database" />;
  }

  // Otherwise, redirect to primary workspace
  return <Redirect href="/(primary)" />;
}
