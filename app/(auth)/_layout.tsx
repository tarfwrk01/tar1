import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { setNavigationBarBlack } from '../utils/navigationBarUtils';

export default function AuthLayout() {
  // Set navigation bar background to black on Android
  React.useEffect(() => {
    setNavigationBarBlack();
  }, []);

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
