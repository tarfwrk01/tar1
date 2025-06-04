import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/auth';
import { setNavigationBarBlack } from '../utils/navigationBarUtils';

export default function AgentsLayout() {
  const { isLoading, user } = useAuth();

  // Set navigation bar background to black on Android
  React.useEffect(() => {
    setNavigationBarBlack();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!user) {
    return null; // Auth provider will redirect to login
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fff' },
          animation: 'none',
        }}
      />
    </>
  );
}
