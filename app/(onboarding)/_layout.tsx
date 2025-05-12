import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/auth';
import { useOnboarding } from '../context/onboarding';

export default function OnboardingLayout() {
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: onboardingLoading } = useOnboarding();

  const isLoading = authLoading || onboardingLoading;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!user) {
    return null; // Auth provider will redirect to login
  }

  return (
    <>
      <StatusBar style="dark" />
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
