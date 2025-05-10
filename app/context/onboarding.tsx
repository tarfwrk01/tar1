import { instant } from '@/lib/instantdb';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './auth';

// Define onboarding context type
type OnboardingContextType = {
  isOnboardingCompleted: boolean;
  currentStep: number;
  isLoading: boolean;
  userName: string | null;
  completeOnboarding: () => Promise<void>;
  updateOnboardingStep: (step: number) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateTursoDatabase: (dbName: string, dbId: string, apiToken: string) => Promise<void>;
};

// Create onboarding context
const OnboardingContext = createContext<OnboardingContextType | null>(null);

// Onboarding provider props
type OnboardingProviderProps = {
  children: React.ReactNode;
};

// Create onboarding provider
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  // Start with undefined to avoid making assumptions about onboarding status
  // We'll determine the actual value once we load profile data
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Store a ref to track if the user has ever completed onboarding
  // This helps prevent resetting onboardingCompleted to false for users who have completed it
  const hasCompletedOnboardingRef = React.useRef<boolean>(false);

  // Add refs to track navigation and initialization state
  const isFirstLoad = React.useRef(true);
  const navigationInProgress = React.useRef(false);
  const lastNavigationTime = React.useRef(0);
  const profileInitialized = React.useRef(false);

  // Get profile data from InstantDB
  const { data: profileData, error: profileError } = instant.useQuery(
    user ? {
      profile: {
        $: {
          where: { userId: user.id },
          fields: ['onboardingCompleted', 'onboardingStep', 'name', 'tursoDbName', 'tursoDbId', 'tursoApiToken']
        }
      }
    } : null
  );

  // Log any errors with the profile query
  useEffect(() => {
    if (profileError) {
      console.error('Error querying profile data:', profileError);
    }
  }, [profileError]);

  // Special effect to handle first load - fixed to not assume returning user
  useEffect(() => {
    if (user && isFirstLoad.current) {
      console.log('FIRST LOAD with user:', user.id);
      isFirstLoad.current = false;

      // Don't make any assumptions about onboarding status on first load
      // We'll determine this based on profile data or lack thereof
      console.log('First load detected, will determine onboarding status from profile data');

      // Start with loading state until we can determine the correct status
      setIsLoading(true);
    }
  }, [user]);

  // Update local state when profile data changes - fixed to ensure new users see onboarding
  useEffect(() => {
    console.log('Onboarding useEffect - profileData:', profileData, 'user:', user?.id, 'isFirstLoad:', isFirstLoad.current);

    if (profileData && profileData.profile && profileData.profile.length > 0) {
      // Profile record exists, update local state
      const profileRecord = profileData.profile[0];
      console.log('Profile record found:', profileRecord);

      // IMPORTANT: Always respect the onboardingCompleted value from the database
      console.log('ONBOARDING STATUS FROM DATABASE:', profileRecord.onboardingCompleted);

      if (profileRecord.onboardingCompleted === true) {
        console.log('User has completed onboarding, setting status to completed');
        setIsOnboardingCompleted(true);
        // Set the ref to remember that this user has completed onboarding
        hasCompletedOnboardingRef.current = true;
        console.log('Setting hasCompletedOnboardingRef to true');
      } else if (profileRecord.onboardingCompleted === false) {
        console.log('User has not completed onboarding, setting status to false');
        setIsOnboardingCompleted(false);
      } else {
        // If it's undefined or null, we need to determine if this is a new user
        // Check if this is a first-time login (no profile data)
        const isNewUser = !profileRecord.createdAt;

        if (isNewUser) {
          console.log('New user detected (no createdAt timestamp), setting onboardingCompleted to false');
          setIsOnboardingCompleted(false);
        } else {
          console.log('Returning user detected, defaulting onboardingCompleted to true');
          setIsOnboardingCompleted(true);
        }
      }

      setCurrentStep(profileRecord.onboardingStep || 0);

      // Set the user name if available
      if (profileRecord.name) {
        console.log('Setting user name from profile:', profileRecord.name);
        setUserName(profileRecord.name);
      } else if (global.userName) {
        console.log('Setting user name from global variable:', global.userName);
        setUserName(global.userName);
      }

      setIsLoading(false);
    } else if (user) {
      // User is authenticated but no profile record found
      console.log('User authenticated but no profile record found');

      // Check if we've already tried to initialize the profile
      if (profileInitialized.current) {
        console.log('Profile initialization already attempted, skipping');
        // Don't assume anything about onboarding status yet
        setIsLoading(false);
        return;
      }

      // Mark that we've attempted to initialize the profile
      profileInitialized.current = true;

      // IMPORTANT: For brand new users (first time ever), set onboardingCompleted to false
      console.log('No profile found for user - this is likely a NEW USER');
      // Default to false for new users without a profile to ensure they see onboarding
      setIsOnboardingCompleted(false);

      // Initialize the profile data in the database with onboardingCompleted=false for new users
      console.log('Initializing profile data for new user');
      initializeOnboardingData(false); // Pass false to indicate this is a new user
    } else if (!user) {
      // No user, set loading to false
      console.log('No user, setting loading to false');
      setIsLoading(false);
    }
  }, [profileData, user]);

  // Handle navigation based on onboarding status - fixed to properly handle undefined state
  useEffect(() => {
    // Prevent navigation if we're already navigating
    if (navigationInProgress.current) {
      console.log('Navigation already in progress, skipping');
      return;
    }

    // Skip navigation effect if we're already on the correct screen
    // This prevents unnecessary refreshes
    if (
      (segments[0] === '(onboarding)' && isOnboardingCompleted === false) ||
      (segments[0] === '(primary)' && isOnboardingCompleted === true)
    ) {
      console.log('Already on the correct screen, skipping navigation');
      return;
    }

    console.log('Navigation effect - isLoading:', isLoading, 'user:', user?.id, 'isOnboardingCompleted:', isOnboardingCompleted, 'segments:', segments);

    if (isLoading) {
      console.log('Still loading, skipping navigation');
      return;
    }

    // Skip navigation if onboarding status is undefined - we don't know yet
    if (isOnboardingCompleted === undefined) {
      console.log('Onboarding status is undefined, waiting for it to be determined');
      return;
    }

    // Throttle navigation - don't navigate more than once every 500ms
    const now = Date.now();
    if (now - lastNavigationTime.current < 500) {
      console.log('Navigation throttled, too soon after last navigation');
      return;
    }

    if (user) {
      console.log('User is authenticated, checking onboarding status');

      // Check if we have profile data that indicates onboarding is completed
      const hasCompletedOnboarding =
        profileData &&
        profileData.profile &&
        profileData.profile.length > 0 &&
        profileData.profile[0].onboardingCompleted === true;

      // If we have profile data showing onboarding is completed, trust that
      if (hasCompletedOnboarding && isOnboardingCompleted !== true) {
        console.log('Profile data shows onboarding is completed, updating local state');
        setIsOnboardingCompleted(true);

        // If we're on an onboarding screen, redirect to primary
        if (segments[0] === '(onboarding)') {
          console.log('Redirecting to primary based on profile data');
          navigationInProgress.current = true;
          lastNavigationTime.current = now;

          // Add a small delay to ensure state updates have propagated
          setTimeout(() => {
            router.replace('/(primary)');
            // Reset navigation flag after a delay to allow for completion
            setTimeout(() => {
              navigationInProgress.current = false;
            }, 1000);
          }, 100);
        }
        return;
      }

      // Check if we have profile data that indicates onboarding is NOT completed
      const hasNotCompletedOnboarding =
        profileData &&
        profileData.profile &&
        profileData.profile.length > 0 &&
        profileData.profile[0].onboardingCompleted === false;

      // If we have profile data showing onboarding is not completed, trust that
      if (hasNotCompletedOnboarding && isOnboardingCompleted !== false) {
        console.log('Profile data shows onboarding is NOT completed, updating local state');
        setIsOnboardingCompleted(false);
      }

      // At this point we know onboarding status is defined and accurate
      if (isOnboardingCompleted === false) {
        console.log('Onboarding not completed, current segment:', segments[0]);
        // User needs to complete onboarding
        if (segments[0] !== '(onboarding)') {
          console.log('Redirecting to onboarding welcome');
          navigationInProgress.current = true;
          lastNavigationTime.current = now;

          // Navigate immediately to prevent multiple refreshes
          router.replace('/(onboarding)/welcome');

          // Reset navigation flag after a delay to allow for completion
          setTimeout(() => {
            navigationInProgress.current = false;
          }, 1000);
        }
      } else if (isOnboardingCompleted === true && segments[0] === '(onboarding)') {
        console.log('Onboarding completed but user is on onboarding screen, redirecting to primary');
        navigationInProgress.current = true;
        lastNavigationTime.current = now;

        // Navigate immediately to prevent multiple refreshes
        router.replace('/(primary)');

        // Reset navigation flag after a delay to allow for completion
        setTimeout(() => {
          navigationInProgress.current = false;
        }, 1000);
      }
    }
  }, [user, isOnboardingCompleted, isLoading, segments, profileData]);

  // Initialize onboarding data for new users - fixed to ensure new users see onboarding
  const initializeOnboardingData = async (isReturningUser = false) => {
    try {
      if (!user) {
        console.log('No user to initialize onboarding data for');
        setIsLoading(false);
        return;
      }

      console.log('Checking if user already has completed onboarding in the past');

      // First check our ref to see if we've already determined this user has completed onboarding
      if (hasCompletedOnboardingRef.current) {
        console.log('CRITICAL: hasCompletedOnboardingRef indicates user has already completed onboarding');
        setIsOnboardingCompleted(true);
        setIsLoading(false);
        return; // Exit immediately, do not continue with initialization
      }

      try {
        // CRITICAL CHECK: Before creating/updating any profile data, check if this user
        // has already completed onboarding in the past

        // First check the local profileData from the useQuery hook
        if (profileData && profileData.profile && profileData.profile.length > 0) {
          const existingProfile = profileData.profile[0];
          console.log('EXISTING PROFILE CHECK:', existingProfile);

          // If user has already completed onboarding in the past, NEVER reset it
          if (existingProfile.onboardingCompleted === true) {
            console.log('CRITICAL: User has already completed onboarding, preserving completed status');
            setIsOnboardingCompleted(true);
            hasCompletedOnboardingRef.current = true; // Set the ref
            setIsLoading(false);
            return; // Exit immediately, do not continue with initialization
          }

          // If onboardingCompleted is explicitly set to false, respect that
          if (existingProfile.onboardingCompleted === false) {
            console.log('User has not completed onboarding yet, continuing with initialization');
            // Explicitly set to false to ensure the onboarding flow is shown
            setIsOnboardingCompleted(false);
          } else {
            // If it's undefined or null for a new user, set to false to ensure they see onboarding
            console.log('Onboarding status is undefined/null, checking if this is a new user');

            // Check if this is a first-time login (no profile data or very recent creation)
            const isNewUser = !existingProfile.createdAt ||
                             (new Date().getTime() - new Date(existingProfile.createdAt).getTime() < 60000);

            if (isNewUser) {
              console.log('NEW USER DETECTED: Setting onboardingCompleted to false');
              setIsOnboardingCompleted(false);
            } else {
              console.log('RETURNING USER: Setting onboardingCompleted to true');
              setIsOnboardingCompleted(true);
              setIsLoading(false);
              return; // Exit immediately, do not continue with initialization
            }
          }
        } else {
          console.log('No existing profile data found for user, this is a NEW USER');
          // For brand new users with no profile, explicitly set to false
          setIsOnboardingCompleted(false);
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
        // Continue with initialization even if check fails
        // For safety, assume this is a new user if we can't determine status
        console.log('Error determining user status, defaulting to NEW USER');
        setIsOnboardingCompleted(false);
      }

      console.log('Initializing onboarding data for user:', user.id);

      try {
        // Create a new profile directly
        console.log('Creating or updating profile record');

        // Check if we have existing profile data from the useQuery hook
        const isNewProfile = !profileData || !profileData.profile || profileData.profile.length === 0;

        // IMPORTANT: For existing profiles, check if onboardingCompleted is already set to true
        const existingOnboardingCompleted =
          profileData &&
          profileData.profile &&
          profileData.profile.length > 0 &&
          profileData.profile[0].onboardingCompleted;

        console.log('TRANSACTION CHECK - isNewProfile:', isNewProfile, 'existingOnboardingCompleted:', existingOnboardingCompleted);

        // Prepare transaction data
        const transactionData: any = {
          userId: user.id,
        };

        // Handle onboardingCompleted status based on user type
        if (isNewProfile) {
          // For brand new profiles (first time users), ALWAYS set to false
          console.log('NEW USER: Setting onboardingCompleted to false for new profile');
          transactionData.onboardingCompleted = false;
        } else if (existingOnboardingCompleted === true) {
          // If it was explicitly true before, keep it true
          console.log('EXISTING USER: Preserving true onboardingCompleted value');
          transactionData.onboardingCompleted = true;
        } else if (existingOnboardingCompleted === false) {
          // If it was explicitly false before, respect that
          console.log('EXISTING USER: Preserving false onboardingCompleted value');
          transactionData.onboardingCompleted = false;
        } else {
          // For users with undefined/null onboardingCompleted, treat as new users
          console.log('UNDEFINED STATUS: Setting onboardingCompleted to false to ensure onboarding is shown');
          transactionData.onboardingCompleted = false;
        }

        // Only set onboardingStep for new profiles
        if (isNewProfile) {
          transactionData.onboardingStep = 0;
          transactionData.createdAt = new Date().toISOString();
        }

        // Log the transaction data
        console.log('Transaction data:', transactionData);

        // Execute the transaction
        await instant.transact(
          instant.tx.profile[user.id].update(transactionData)
        );
        console.log('Profile created or updated successfully');

        // Update local state based on what we just saved
        console.log('Setting onboarding status based on transaction:', transactionData.onboardingCompleted);

        // Always use the transaction data for consistency
        if (transactionData.onboardingCompleted !== undefined) {
          setIsOnboardingCompleted(transactionData.onboardingCompleted);
        } else if (isNewProfile) {
          // For new users without explicit value, default to false
          console.log('No explicit onboardingCompleted in transaction, defaulting to false for new user');
          setIsOnboardingCompleted(false);
        }

        // Set step to 0 for new profiles
        if (isNewProfile) {
          setCurrentStep(0);
        }
      } catch (error) {
        console.error('Error creating/updating profile:', error);
        throw error;
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing onboarding data:', error);
      Alert.alert('Error', 'Failed to initialize onboarding data. Please try again.');
      setIsLoading(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      if (!user) return;

      setIsLoading(true);
      console.log('Completing onboarding for user:', user.id);

      // Check if we have existing profile data from the useQuery hook
      const isNewProfile = !profileData || !profileData.profile || profileData.profile.length === 0;

      console.log('Completing onboarding, profile exists:', !isNewProfile);

      // Use the correct transaction API
      await instant.transact(
        instant.tx.profile[user.id].update({
          userId: user.id, // Ensure userId is set
          onboardingCompleted: true,
          // If we're creating a new record, set these defaults
          ...(isNewProfile && {
            createdAt: new Date().toISOString(),
          }),
        })
      );

      console.log('Onboarding completed successfully and marked as completed in database');

      // Update local state
      setIsOnboardingCompleted(true);

      // Set the ref to remember that this user has completed onboarding
      hasCompletedOnboardingRef.current = true;

      // Log the current state to verify
      console.log('Local state updated, onboardingCompleted: true, hasCompletedOnboardingRef: true');

      setIsLoading(false);

      // Use navigation flags to prevent duplicate navigations
      navigationInProgress.current = true;
      lastNavigationTime.current = Date.now();

      // Add a small delay to ensure state updates have propagated
      setTimeout(() => {
        router.replace('/(primary)');
        // Reset navigation flag after a delay to allow for completion
        setTimeout(() => {
          navigationInProgress.current = false;
        }, 1000);
      }, 100);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  // Update onboarding step
  const updateOnboardingStep = async (step: number) => {
    try {
      if (!user) return;

      setIsLoading(true);
      console.log('Updating onboarding step to:', step, 'for user:', user.id);

      // Check if user has already completed onboarding
      if (hasCompletedOnboardingRef.current) {
        console.log('User has already completed onboarding, only updating step without changing completion status');
      }

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId and step
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            onboardingStep: step,
            createdAt: new Date().toISOString(),
            // Only set onboardingCompleted to false if user hasn't already completed onboarding
            ...(hasCompletedOnboardingRef.current ? { onboardingCompleted: true } : { onboardingCompleted: false })
          })
        );
      } else {
        // Check if the profile has onboardingCompleted set to true
        const hasCompletedOnboarding =
          profileData?.profile?.[0]?.onboardingCompleted === true;

        // If onboardingCompleted is true, preserve it
        if (hasCompletedOnboarding) {
          hasCompletedOnboardingRef.current = true;
          console.log('Found onboardingCompleted=true in profile, preserving it');

          // Update existing profile without changing onboardingCompleted
          await instant.transact(
            instant.tx.profile[user.id].update({
              userId: user.id, // Always include userId to ensure it exists
              onboardingStep: step,
            })
          );
        } else {
          // Update existing profile
          await instant.transact(
            instant.tx.profile[user.id].update({
              userId: user.id, // Always include userId to ensure it exists
              onboardingStep: step,
            })
          );
        }
      }

      console.log('Onboarding step updated successfully');
      setCurrentStep(step);
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      Alert.alert('Error', 'Failed to update onboarding step. Please try again.');
      setIsLoading(false);
    }
  };

  // Update user name
  const updateUserName = async (name: string) => {
    try {
      if (!user) return;

      setIsLoading(true);
      console.log('Updating user name to:', name, 'for user:', user.id);

      // Update the local state immediately
      setUserName(name);

      // Store in global variable as backup
      global.userName = name;

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId and name
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            name,
            createdAt: new Date().toISOString(),
            // Only set onboardingCompleted to false if user hasn't already completed onboarding
            ...(hasCompletedOnboardingRef.current ? { onboardingCompleted: true } : { onboardingCompleted: false }),
            onboardingStep: 1
          })
        );
      } else {
        // Check if the profile has onboardingCompleted set to true
        const hasCompletedOnboarding =
          profileData?.profile?.[0]?.onboardingCompleted === true;

        // If onboardingCompleted is true, preserve it
        if (hasCompletedOnboarding) {
          hasCompletedOnboardingRef.current = true;
          console.log('Found onboardingCompleted=true in profile, preserving it');
        }

        // Update existing profile without changing onboardingCompleted
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id, // Always include userId to ensure it exists
            name,
          })
        );
      }

      console.log('User name updated successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating user name:', error);
      Alert.alert('Error', 'Failed to update user name. Please try again.');
      setIsLoading(false);
    }
  };

  // Update Turso database information
  const updateTursoDatabase = async (dbName: string, dbId: string, apiToken: string) => {
    try {
      if (!user) return;

      setIsLoading(true);
      console.log('Updating Turso database info for user:', user.id);
      console.log('Database Name:', dbName);
      console.log('Database ID:', dbId);
      console.log('API Token:', apiToken ? 'Token provided' : 'No token provided');

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId and database info
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            tursoDbName: dbName,
            tursoDbId: dbId,
            tursoApiToken: apiToken,
            createdAt: new Date().toISOString(),
            // Only set onboardingCompleted to false if user hasn't already completed onboarding
            ...(hasCompletedOnboardingRef.current ? { onboardingCompleted: true } : { onboardingCompleted: false }),
            onboardingStep: 3
          })
        );
      } else {
        // Check if the profile has onboardingCompleted set to true
        const hasCompletedOnboarding =
          profileData?.profile?.[0]?.onboardingCompleted === true;

        // If onboardingCompleted is true, preserve it
        if (hasCompletedOnboarding) {
          hasCompletedOnboardingRef.current = true;
          console.log('Found onboardingCompleted=true in profile, preserving it');
        }

        // Update existing profile without changing onboardingCompleted
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id, // Always include userId to ensure it exists
            tursoDbName: dbName,
            tursoDbId: dbId,
            tursoApiToken: apiToken,
          })
        );
      }

      console.log('Turso database info updated successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating Turso database info:', error);
      Alert.alert('Error', 'Failed to update database information. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingCompleted,
        currentStep,
        isLoading,
        userName,
        completeOnboarding,
        updateOnboardingStep,
        updateUserName,
        updateTursoDatabase,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// Custom hook to use onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
