import { instant } from '@/lib/instantdb';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

// Define user type
type User = {
  id: string;
  email: string;
  name?: string;
};

// Define auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  signOut: () => void;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider props
type AuthProviderProps = {
  children: React.ReactNode;
};

// Create auth provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Use InstantDB's auth hook
  const { user: instantUser, isLoading: authLoading } = instant.useAuth();

  // We'll log auth state changes in the main effect

  // Track if this is the first auth check
  const isFirstAuthRef = React.useRef(true);

  // Update our user state when InstantDB auth changes
  useEffect(() => {
    const updateUserState = async () => {
      try {
        if (instantUser) {
          // Only log on initial authentication, not on subsequent renders
          if (isFirstAuthRef.current) {
            console.log('User authenticated with email:', instantUser.email);
            isFirstAuthRef.current = false;
          }

          // Set the user in state
          setUser({
            id: instantUser.id,
            email: instantUser.email
          });

          // Check if we need to redirect
          if (segments[0] === '(auth)') {
            router.replace('/(primary)');
          }
        } else {
          // Only log on initial check
          if (isFirstAuthRef.current) {
            console.log('No authenticated user');
            isFirstAuthRef.current = false;
          }

          setUser(null);

          // Check if we need to redirect
          if (segments[0] !== '(auth)' && segments[0] !== undefined) {
            router.replace('/(auth)/login');
          }
        }
      } catch (error) {
        console.error('Error updating user state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      updateUserState();
    }
  }, [instantUser, authLoading, segments, router]);

  // Send magic code to email
  const signIn = async (email: string) => {
    try {
      setIsLoading(true);

      // Send the magic code
      await instant.auth.sendMagicCode({ email });

      // Navigate to verify screen with email as a query param
      // Use replace instead of push to avoid navigation stack issues
      router.replace(`/(auth)/verify?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Error sending magic code:', error);
      Alert.alert('Error', 'Failed to send magic code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify magic code
  const verifyCode = async (email: string, code: string) => {
    try {
      setIsLoading(true);

      // Verify the magic code
      await instant.auth.signInWithMagicCode({ email, code });

      // The auth hook will handle the redirect
      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Invalid code. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await instant.auth.signOut();
      // The auth hook will handle the redirect
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Show loading indicator while auth is initializing
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, verifyCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
