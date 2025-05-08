import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/auth';

export default function Index() {
  const { user, isLoading } = useAuth();

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(primary)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
