import { instant } from '@/lib/instantdb';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { clearCredentialCache } from '../utils/credentialCache';

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
  signIn: (email: string, skipNavigation?: boolean) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  signOut: () => void;
};

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider props
type AuthProviderProps = {
  children: React.ReactNode;
};

// We'll use refs instead of static flags for better component lifecycle management

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
  const [isFirstAuth, setIsFirstAuth] = useState(true);

  // Track if navigation is in progress to prevent multiple redirects
  const navigationInProgressRef = useRef(false);

  // Update our user state when InstantDB auth changes
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;

    const updateUserState = async () => {
      try {
        if (instantUser) {
          // Only log on initial authentication, not on subsequent renders
          if (isFirstAuth) {
            console.log('User authenticated with email:', instantUser.email);
            setIsFirstAuth(false);
          }

          // Set the user in state
          setUser({
            id: instantUser.id,
            email: instantUser.email
          });

          // Don't automatically redirect from auth screens
          // The onboarding context will handle redirection based on onboarding status
          console.log('User authenticated, current segment:', segments[0]);
        } else {
          // Only log on initial check
          if (isFirstAuth) {
            console.log('No authenticated user');
            setIsFirstAuth(false);
          }

          setUser(null);

          // Check if we need to redirect and not already navigating
          if (segments[0] !== '(auth)' && segments[0] !== undefined && !navigationInProgressRef.current) {
            console.log('Redirecting to login screen');

            // Set navigation flag to prevent multiple redirects
            navigationInProgressRef.current = true;

            // Navigate directly without setTimeout
            router.replace('/(auth)/login');

            // Reset navigation flag after a delay
            setTimeout(() => {
              navigationInProgressRef.current = false;
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error updating user state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateUserState();
  }, [instantUser, authLoading, segments, router]);

  // Use a ref to track sign-in in progress
  const signInInProgressRef = useRef(false);

  // Send magic code to email - fixed to prevent multiple refreshes
  const signIn = async (email: string, skipNavigation = false) => {
    console.log('[AUTH] signIn called with email:', email, 'skipNavigation:', skipNavigation);

    // Prevent multiple calls with stronger protection
    if (signInInProgressRef.current) {
      console.log('[AUTH] Sign-in already in progress, ignoring duplicate call');
      return;
    }

    // Lock immediately and don't reset until completely done
    signInInProgressRef.current = true;

    try {
      // Normalize the email
      const normalizedEmail = email.trim().toLowerCase();
      console.log('[AUTH] Normalized email:', normalizedEmail);

      // Send magic code
      console.log('[AUTH] Sending magic code...');
      // @ts-ignore - InstantDB types may be outdated
      await instant.auth.sendMagicCode({
        email: normalizedEmail,
        options: {
          expiresIn: 10 * 60,
          codeLength: 6
        }
      });

      console.log('[AUTH] Magic code sent successfully');

      // Check if we should skip navigation (for resend from verify screen)
      if (skipNavigation) {
        console.log('[AUTH] Skipping navigation as requested');
        // Reset the lock immediately since we're not navigating
        signInInProgressRef.current = false;
        return;
      }

      // Check if we're already on the verify screen
      const isAlreadyOnVerifyScreen = segments[0] === '(auth)' && segments[1] === 'verify';
      if (isAlreadyOnVerifyScreen) {
        console.log('[AUTH] Already on verify screen, skipping navigation');
        // Reset the lock immediately since we're not navigating
        signInInProgressRef.current = false;
        return;
      }

      // IMPORTANT: Navigate directly without setTimeout to prevent multiple refreshes
      console.log('[AUTH] Navigating to verify screen immediately');

      // Set navigation flag to prevent multiple redirects
      navigationInProgressRef.current = true;

      // Navigate directly without setTimeout
      router.replace({
        pathname: '/(auth)/verify',
        params: { email: normalizedEmail }
      });

      // Keep the lock active until component unmounts
      // The lock will be reset when the component unmounts or after a timeout
      setTimeout(() => {
        console.log('[AUTH] Resetting navigation and sign-in locks after timeout');
        navigationInProgressRef.current = false;
        signInInProgressRef.current = false;
      }, 2000); // Longer timeout to ensure navigation completes

      return;
    } catch (error: any) {
      console.error('[AUTH] Error sending magic code:', error);

      // Reset lock on error
      signInInProgressRef.current = false;
      navigationInProgressRef.current = false;

      // Show appropriate error
      if (error?.message && typeof error.message === 'string' && error.message.includes('rate limit')) {
        Alert.alert(
          'Too Many Attempts',
          'You have requested too many codes. Please wait a few minutes and try again.'
        );
      } else {
        Alert.alert('Error', 'Failed to send magic code. Please try again.');
      }

      throw error; // Re-throw to let caller handle it
    }
  };

  // Use a ref to track verification in progress
  const verifyCodeInProgressRef = useRef(false);

  // Verify magic code - fixed to prevent multiple refreshes
  const verifyCode = async (email: string, code: string) => {
    console.log('[AUTH] verifyCode called with email:', email);

    // Prevent multiple calls with stronger protection
    if (verifyCodeInProgressRef.current) {
      console.log('[AUTH] Verification already in progress, ignoring duplicate call');
      return false;
    }

    // Lock immediately and don't reset until completely done
    verifyCodeInProgressRef.current = true;

    try {
      // Normalize the code
      const normalizedCode = code.trim().replace(/\s+/g, '');
      console.log('[AUTH] Normalized code:', normalizedCode);

      // Verify the magic code
      console.log('[AUTH] Verifying magic code...');
      // @ts-ignore - InstantDB types may be outdated
      await instant.auth.signInWithMagicCode({
        email,
        code: normalizedCode,
        options: {
          expiresIn: 10 * 60,
        }
      });

      console.log('[AUTH] Magic code verification successful');

      // After successful authentication, the onboarding context will handle navigation
      // based directly on the InstantDB profile data
      console.log('[AUTH] Authentication successful - onboarding context will handle navigation');

      // Reset the locks after a delay
      setTimeout(() => {
        console.log('[AUTH] Resetting verification locks after timeout');
        navigationInProgressRef.current = false;
        verifyCodeInProgressRef.current = false;
      }, 2000); // Longer timeout to ensure navigation completes

      return true;
    } catch (error: any) {
      console.error('[AUTH] Error verifying code:', error);

      // Reset lock on error
      verifyCodeInProgressRef.current = false;
      navigationInProgressRef.current = false;

      // Show appropriate error
      if (error?.message && typeof error.message === 'string') {
        if (error.message.includes('Record not found: app-user-magic-code')) {
          Alert.alert(
            'Invalid Code',
            'The verification code is invalid or has expired. Please request a new code and try again.'
          );
        } else if (error.message.includes('expired')) {
          Alert.alert(
            'Code Expired',
            'The verification code has expired. Please request a new code.'
          );
        } else {
          Alert.alert('Error', 'Failed to verify code. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to verify code. Please try again.');
      }

      return false;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear cached credentials before signing out
      await clearCredentialCache();
      console.log('[Auth] Credential cache cleared on logout');

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

// Add default export for the AuthProvider
export default AuthProvider;
