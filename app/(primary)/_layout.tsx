import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';

// Custom tab button component that doesn't show press effects
const TabButton = ({
  children,
  onPress
}: {
  children: React.ReactNode;
  onPress?: any // Using any type to accept any function type
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={1} // This prevents the opacity change on press
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function PrimaryLayout() {
  const { isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();

  // Set navigation bar background to black on Android
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const SystemUI = require('expo-system-ui');
      SystemUI.setBackgroundColorAsync('#000000');
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!user) {
    return null; // Auth provider will redirect to login
  }

  const LayoutWrapper = require('../../components/LayoutWrapper').default;

  return (
    <LayoutWrapper showTopBar={true} topBarTitle="Workspace">
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#999',
          headerShown: false,
          tabBarShowLabel: false,
          animation: 'none',
          tabBarStyle: {
            height: 50 + (Platform.OS === 'android' ? Math.max(insets.bottom, 20) : 0),
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : 5,
            paddingTop: 5,
          },
          // Disable press effects
          tabBarItemStyle: {
            opacity: 1,
          },
          // Use custom button component to disable tap/press effects
          tabBarButton: (props) => {
            const { onPress, children } = props;
            return <TabButton onPress={onPress}>{children}</TabButton>;
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="workspaces-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aichat"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="square" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="at-circle-outline" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
    </LayoutWrapper>
  );
}
