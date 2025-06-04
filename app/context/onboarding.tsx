import { instant } from '@/lib/instantdb';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
    cacheCredentials,
    TursoCredentials
} from '../utils/credentialCache';
import { useAuth } from './auth';

// Define onboarding context type
type OnboardingContextType = {
  isOnboardingCompleted: boolean | undefined;
  currentStep: number;
  isLoading: boolean;
  userName: string | null;
  profileData: any; // Add profileData to context
  completeOnboarding: () => Promise<void>;
  updateOnboardingStep: (step: number) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateTursoDatabase: (dbName: string, apiToken: string) => Promise<void>;
  ensureMemoriesTable: () => Promise<void>;
};

// Create onboarding context
const OnboardingContext = createContext<OnboardingContextType | null>(null);

// Onboarding provider props
type OnboardingProviderProps = {
  children: React.ReactNode;
};

// Create onboarding provider
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  // Start with undefined - onboardingCompleted will only be set to true when onboarding flow is completed
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Add refs to track navigation and initialization state
  const navigationInProgress = useRef(false);
  const lastNavigationTime = useRef(0);
  const profileInitialized = useRef(false);
  const onboardingTransitionInProgress = useRef(false);

  // Track which user we've initialized to prevent cross-user contamination
  const initializedUserId = useRef<string | null>(null);

  // InstantDB-first approach for profile data - use InstantDB useQuery directly
  const { data: profileData, error: profileError, isLoading: profileLoading } = instant.useQuery(
    user ? {
      profile: {
        $: {
          where: { userId: user.id },
          fields: ['onboardingCompleted', 'name', 'tursoDbName', 'tursoApiToken']
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

  // InstantDB-first profile state management
  useEffect(() => {
    const handleProfileState = async () => {
      if (!user) {
        // Reset tracking when user logs out
        profileInitialized.current = false;
        initializedUserId.current = null;
        // IMPORTANT: Set loading to false when there's no user
        setIsLoading(false);
        return;
      }

      // Reset initialization state if this is a different user
      if (initializedUserId.current && initializedUserId.current !== user.id) {
        console.log('[Onboarding] Different user detected, resetting initialization state');
        profileInitialized.current = false;
        initializedUserId.current = null;
      }

      console.log('[Onboarding] Profile state check - user:', user.id);

      // If profile data is still loading, wait
      if (profileLoading) {
        console.log('[Onboarding] Profile data is still loading, waiting...');
        return;
      }

      // Handle profile data from InstantDB
      if (profileData && profileData.profile && profileData.profile.length > 0) {
        const profile = profileData.profile[0];
        console.log('[Onboarding] Profile found:', profile);

        // CRITICAL: Mark this user as having a profile to prevent re-initialization
        profileInitialized.current = true;
        initializedUserId.current = user.id;

        // Set onboarding status from InstantDB
        setIsOnboardingCompleted(profile.onboardingCompleted);

        // Set user name if available
        if (profile.name) {
          setUserName(profile.name);
        }

        // For existing users with completed onboarding, cache credentials after sign in
        if (profile.onboardingCompleted && profile.tursoDbName && profile.tursoApiToken) {
          const credentialsToCache: TursoCredentials = {
            tursoDbName: profile.tursoDbName,
            tursoApiToken: profile.tursoApiToken,
            userId: user.id,
            onboardingCompleted: profile.onboardingCompleted,
            userName: profile.name || undefined
          };

          // Cache credentials for existing users
          cacheCredentials(credentialsToCache).then(() => {
            console.log('[Onboarding] Existing user credentials cached after sign in');
          }).catch((error) => {
            console.warn('[Onboarding] Failed to cache existing user credentials:', error);
          });
        }

        setIsLoading(false);
      } else if (!profileLoading && !profileInitialized.current && initializedUserId.current !== user.id) {
        // ENHANCED CONDITION: Only initialize if:
        // 1. Profile data is not loading
        // 2. Profile has never been initialized for this user session
        // 3. This user hasn't been processed before
        // 4. We truly have no profile data

        console.log('[Onboarding] Checking if this is truly a new user...');
        console.log('[Onboarding] profileData:', profileData);
        console.log('[Onboarding] profileLoading:', profileLoading);
        console.log('[Onboarding] profileInitialized.current:', profileInitialized.current);
        console.log('[Onboarding] initializedUserId.current:', initializedUserId.current);
        console.log('[Onboarding] current user.id:', user.id);

        // Double-check that we really have no profile data
        const hasNoProfile = !profileData ||
                            !profileData.profile ||
                            profileData.profile.length === 0;

        if (hasNoProfile) {
          console.log('[Onboarding] New user detected, initializing profile data');
          profileInitialized.current = true;
          initializedUserId.current = user.id;
          setIsOnboardingCompleted(false);
          initializeOnboardingData();
        } else {
          console.log('[Onboarding] Profile data exists, skipping initialization');
          profileInitialized.current = true;
          initializedUserId.current = user.id;
        }
      } else {
        console.log('[Onboarding] Skipping profile state handling - profileLoading:', profileLoading, 'profileInitialized:', profileInitialized.current, 'initializedUserId:', initializedUserId.current);
      }
    };

    handleProfileState();
  }, [user, profileData, profileLoading]);



  // Handle navigation based on InstantDB profile data
  useEffect(() => {
    const handleNavigation = async () => {
      // Prevent navigation if we're already navigating
      if (navigationInProgress.current) {
        console.log('Navigation already in progress, skipping');
        return;
      }

      // Skip navigation if we're in the middle of an onboarding transition
      if (onboardingTransitionInProgress.current) {
        console.log('Onboarding transition in progress, skipping navigation');
        return;
      }

      console.log('[Navigation] Navigation effect - isLoading:', isLoading, 'user:', user?.id, 'segments:', segments);

      // If there's no user, don't handle navigation here - let the auth context handle it
      if (!user) {
        console.log('No user, letting auth context handle navigation');
        return;
      }

      // Skip navigation if profile data is still loading
      if (profileLoading) {
        console.log('Profile data is still loading, skipping navigation');
        return;
      }

      if (isLoading) {
        console.log('Still loading, skipping navigation');
        return;
      }

      // Throttle navigation - don't navigate more than once every 500ms
      const now = Date.now();
      if (now - lastNavigationTime.current < 500) {
        console.log('Navigation throttled, too soon after last navigation');
        return;
      }

      // InstantDB-first onboarding status check
      const hasCompletedOnboarding =
        profileData &&
        profileData.profile &&
        profileData.profile.length > 0 &&
        profileData.profile[0].onboardingCompleted === true;

      console.log('[Navigation] Using InstantDB onboarding status:', hasCompletedOnboarding);

      // Allow navigation to settings/profile/agents screens even if onboarding is completed
      if (segments[0] === '(settings)' || segments[0] === '(agents)') {
        // Only log once per session when entering agents section to reduce console spam
        if (segments[0] === '(agents)' && !navigationInProgress.current) {
          console.log('[Navigation] User is in agents section');
        } else if (segments[0] === '(settings)') {
          console.log('[Navigation] User is on settings screen, allowing navigation');
        }
        // Reset navigation flags to ensure future navigation works correctly
        navigationInProgress.current = false;
        return;
      }

      // If we're trying to navigate to profile, allow it
      if (segments.join('/').includes('profile')) {
        console.log('[Navigation] Navigation to profile detected, allowing navigation');
        navigationInProgress.current = false;
        return;
      }

      // Skip navigation if we're already on the correct screen
      if (
        (segments[0] === '(onboarding)' && !hasCompletedOnboarding) ||
        (segments[0] === '(primary)' && hasCompletedOnboarding)
      ) {
        console.log('[Navigation] Already on the correct screen, skipping navigation');
        return;
      }

      // Navigate based on InstantDB onboarding status
      if (hasCompletedOnboarding) {
        // If onboarding is completed, go to primary screen
        // But only if not already on a settings or agents screen
        if (segments[0] !== '(primary)' &&
            segments.join('/').indexOf('(settings)') === -1 &&
            segments.join('/').indexOf('(agents)') === -1) {
          console.log('[Navigation] Onboarding completed, redirecting to primary');
          navigationInProgress.current = true;
          lastNavigationTime.current = now;

          // Navigate immediately to prevent multiple refreshes
          router.replace('/(primary)');

          // Reset navigation flag after a delay to allow for completion
          setTimeout(() => {
            navigationInProgress.current = false;
          }, 1000);
        }
      } else {
        // If onboarding is not completed, go to onboarding screen
        // This includes:
        // 1. Users with onboardingCompleted === false
        // 2. New users with no profile yet
        // 3. Users with undefined onboardingCompleted status
        const needsOnboarding =
          !hasCompletedOnboarding && // Not explicitly completed
          (
            // Case 1: No profile data yet (new user)
            !profileData ||
            !profileData.profile ||
            profileData.profile.length === 0 ||
            // Case 2: Profile exists but onboarding not completed
            profileData.profile[0]?.onboardingCompleted === false ||
            // Case 3: Profile exists but onboardingCompleted is undefined/null
            profileData.profile[0]?.onboardingCompleted == null
          );

        console.log('[Navigation] NAVIGATION CHECK: needsOnboarding:', needsOnboarding, 'hasCompletedOnboarding:', hasCompletedOnboarding, 'currentSegment:', segments[0]);

        if (needsOnboarding && segments[0] !== '(onboarding)') {
          console.log('[Navigation] User needs onboarding, redirecting to database screen');
          navigationInProgress.current = true;
          lastNavigationTime.current = now;

          // Navigate immediately to prevent multiple refreshes
          router.replace('/(onboarding)/database');

          // Reset navigation flag after a delay to allow for completion
          setTimeout(() => {
            navigationInProgress.current = false;
          }, 1000);
        }
      }
    };

    handleNavigation();
  }, [user, isLoading, segments, profileData, profileLoading]);

  // Initialize onboarding data for new users - only creates basic profile without setting onboardingCompleted
  const initializeOnboardingData = async () => {
    try {
      if (!user) {
        console.log('No user to initialize onboarding data for');
        setIsLoading(false);
        return;
      }

      console.log('Checking if user already has completed onboarding in the past');

      // ENHANCED SAFEGUARD: Re-query the profile data directly to ensure we have the latest state
      // This prevents race conditions where profileData might be stale
      try {
        const freshProfileQuery = await instant.query({
          profile: {
            $: {
              where: { userId: user.id },
              fields: ['onboardingCompleted', 'name', 'tursoDbName', 'tursoApiToken']
            }
          }
        });

        if (freshProfileQuery && freshProfileQuery.profile && freshProfileQuery.profile.length > 0) {
          const existingProfile = freshProfileQuery.profile[0];
          console.log('FRESH PROFILE CHECK:', existingProfile);

          // If user has already completed onboarding in the past, NEVER reset it
          if (existingProfile.onboardingCompleted === true) {
            console.log('CRITICAL: Fresh query shows user has completed onboarding, aborting initialization');
            setIsOnboardingCompleted(true);
            setIsLoading(false);
            return; // Exit immediately, do not continue with initialization
          }

          // If profile exists but onboarding is not completed, also exit without creating new profile
          if (existingProfile.onboardingCompleted === false) {
            console.log('Fresh query shows user profile exists with onboarding not completed, preserving status');
            setIsOnboardingCompleted(false);
            setIsLoading(false);
            return;
          }

          // If profile exists with any other status, preserve it and exit
          console.log('Fresh query shows existing profile, preserving current state and aborting initialization');
          setIsOnboardingCompleted(existingProfile.onboardingCompleted);
          setIsLoading(false);
          return;
        }
      } catch (queryError) {
        console.warn('Failed to perform fresh profile query, falling back to cached data:', queryError);
      }

      // Fallback: Check the local profileData from the useQuery hook
      if (profileData && profileData.profile && profileData.profile.length > 0) {
        const existingProfile = profileData.profile[0];
        console.log('EXISTING PROFILE CHECK (fallback):', existingProfile);

        // If user has already completed onboarding in the past, NEVER reset it
        if (existingProfile.onboardingCompleted === true) {
          console.log('CRITICAL: User has already completed onboarding, preserving completed status');
          setIsOnboardingCompleted(true);
          setIsLoading(false);
          return; // Exit immediately, do not continue with initialization
        }

        // If profile exists but onboarding is not completed, also exit without creating new profile
        if (existingProfile.onboardingCompleted === false) {
          console.log('User profile exists with onboarding not completed, preserving status');
          setIsOnboardingCompleted(false);
          setIsLoading(false);
          return;
        }

        // If profile exists with any other status, preserve it and exit
        console.log('Existing profile found, preserving current state and aborting initialization');
        setIsOnboardingCompleted(existingProfile.onboardingCompleted);
        setIsLoading(false);
        return;
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

        // Handle onboardingCompleted status
        if (existingOnboardingCompleted === true) {
          // If it was explicitly true before, keep it true
          console.log('EXISTING USER: Preserving true onboardingCompleted value');
          transactionData.onboardingCompleted = true;
        } else if (isNewProfile) {
          // For new users, explicitly set onboardingCompleted to false
          console.log('NEW USER: Setting onboardingCompleted to false for new profile');
          transactionData.onboardingCompleted = false;
        }
        // For existing profiles with incomplete onboarding, don't change the status

        // Set createdAt for new profiles
        if (isNewProfile) {
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
        if (transactionData.onboardingCompleted === true) {
          setIsOnboardingCompleted(true);
        } else if (transactionData.onboardingCompleted === false) {
          setIsOnboardingCompleted(false);
        }
        // Otherwise leave onboardingCompleted as undefined

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

  // Complete onboarding - this is the ONLY place where onboardingCompleted gets set to true
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
          onboardingCompleted: true, // This is the ONLY place where onboardingCompleted gets set to true
          // If we're creating a new record, set these defaults
          ...(isNewProfile && {
            createdAt: new Date().toISOString(),
          }),
        })
      );

      console.log('Onboarding completed successfully and marked as completed in database');

      // Update cache with onboarding completion status
      if (profileData?.profile?.[0]?.tursoDbName && profileData?.profile?.[0]?.tursoApiToken) {
        const credentialsToCache: TursoCredentials = {
          tursoDbName: profileData.profile[0].tursoDbName,
          tursoApiToken: profileData.profile[0].tursoApiToken,
          userId: user.id,
          onboardingCompleted: true,
          userName: profileData.profile[0].name || userName || undefined
        };
        await cacheCredentials(credentialsToCache);
        console.log('[Onboarding] Completion status cached');
      }

      // Update local state
      setIsOnboardingCompleted(true);

      // Log the current state to verify
      console.log('Local state updated, onboardingCompleted: true');

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

      // Set the transition lock to prevent navigation interruptions
      onboardingTransitionInProgress.current = true;
      console.log('Setting onboarding transition lock');

      setIsLoading(true);
      console.log('Updating onboarding step to:', step, 'for user:', user.id);

      // Check if user has already completed onboarding
      const hasCompletedOnboarding =
        profileData?.profile?.[0]?.onboardingCompleted === true ||
        isOnboardingCompleted === true;

      if (hasCompletedOnboarding) {
        console.log('User has already completed onboarding');
      }

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            createdAt: new Date().toISOString(),
            // Only preserve true onboardingCompleted values
            ...(hasCompletedOnboarding ? { onboardingCompleted: true } : {})
          })
        );
      }

      console.log('Onboarding step updated successfully');
      setCurrentStep(step);
      setIsLoading(false);

      // Release the transition lock after a delay to ensure navigation completes
      setTimeout(() => {
        console.log('Releasing onboarding transition lock');
        onboardingTransitionInProgress.current = false;
      }, 1000);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      Alert.alert('Error', 'Failed to update onboarding step. Please try again.');
      setIsLoading(false);

      // Release the transition lock even on error
      onboardingTransitionInProgress.current = false;
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
      // @ts-ignore - global variable for backup
      global.userName = name;

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      // Check if user has already completed onboarding
      const hasCompletedOnboarding =
        profileData?.profile?.[0]?.onboardingCompleted === true ||
        isOnboardingCompleted === true;

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId and name
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            name,
            createdAt: new Date().toISOString(),
            // Only preserve true onboardingCompleted values
            ...(hasCompletedOnboarding ? { onboardingCompleted: true } : {})
          })
        );
      } else {
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

  // Update Turso database information and complete onboarding
  const updateTursoDatabase = async (dbName: string, apiToken: string) => {
    try {
      if (!user) return;

      setIsLoading(true);
      console.log('Updating Turso database info for user:', user.id);
      console.log('Database Name:', dbName);
      console.log('API Token:', apiToken ? 'Token provided' : 'No token provided');

      // Check if profile exists
      const profileExists = profileData &&
                           profileData.profile &&
                           profileData.profile.length > 0;

      // Get user name from profile or use email if not available
      const existingName = profileData?.profile?.[0]?.name;
      const defaultName = user.email ? user.email.split('@')[0] : null;

      console.log('Updating Turso database info for user:', user.id);
      console.log('Database Name:', dbName);
      console.log('API Token:', apiToken ? 'Token provided' : 'No token');

      if (!profileExists) {
        console.log('Profile does not exist, creating it first');
        // Create profile with userId and database info
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id,
            name: existingName || defaultName, // Use existing name or default from email
            tursoDbName: dbName,
            tursoApiToken: apiToken,
            createdAt: new Date().toISOString(),
            onboardingCompleted: true // Set onboarding as completed
          })
        );
      } else {
        // Update existing profile and set onboardingCompleted to true
        await instant.transact(
          instant.tx.profile[user.id].update({
            userId: user.id, // Always include userId to ensure it exists
            // Only set name if it doesn't exist already
            ...(existingName ? {} : { name: defaultName }),
            tursoDbName: dbName,
            tursoApiToken: apiToken,
            onboardingCompleted: true // Set onboarding as completed
          })
        );
      }

      console.log('Turso database info updated successfully and onboarding completed');

      // Cache the credentials for better performance
      const credentialsToCache: TursoCredentials = {
        tursoDbName: dbName,
        tursoApiToken: apiToken,
        userId: user.id,
        onboardingCompleted: true,
        userName: existingName || defaultName || undefined
      };

      await cacheCredentials(credentialsToCache);
      console.log('[Onboarding] Credentials cached successfully with onboarding status');

      // Update local state with name if we have it
      if (existingName || defaultName) {
        setUserName(existingName || defaultName);
      }

      console.log('Turso database info updated successfully and onboarding completed');

      // Update local state
      setIsOnboardingCompleted(true);
      setCurrentStep(4);
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
      console.error('Error updating Turso database info:', error);
      Alert.alert('Error', 'Failed to update database information. Please try again.');
      setIsLoading(false);
    }
  };

  // Function to ensure required tables exist
  const ensureMemoriesTable = async () => {
    try {
      setIsLoading(true);

      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get profile data
      const profile = profileData?.profile?.[0];
      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        console.error('Missing database credentials in profile');
        return;
      }

      const { tursoDbName, tursoApiToken } = profile;
      console.log('Ensuring required tables exist...');
      console.log('Database Name:', tursoDbName);
      console.log('API Token available:', !!tursoApiToken);

      // Construct the API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Prepare request body with multiple table creation queries
      const requestBody = {
        requests: [
          {
            type: "execute",
            stmt: {
              sql: `CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY,
                content TEXT NOT NULL,
                \`group\` TEXT NOT NULL
              )`
            }
          },
          {
            type: "execute",
            stmt: {
              sql: `CREATE TABLE IF NOT EXISTS tableconfig (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                config TEXT NOT NULL
              )`
            }
          }
        ]
      };

      // Make API call to create the tables
      console.log('Sending API request to create tables...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response Status:', response.status);

      // Get response as text for logging
      const responseText = await response.text();
      console.log('API Response Text:', responseText);

      if (!response.ok) {
        console.error('Failed to create tables. Response not OK.');
        throw new Error(`Failed to create tables: ${responseText}`);
      }

      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('Tables creation response (parsed):', JSON.stringify(data, null, 2));

        // Check for errors in the response
        if (data.results && data.results.some(result => result.type === 'error')) {
          const errorResult = data.results.find(result => result.type === 'error');
          console.error('SQL Error in response:', errorResult.error);
          throw new Error(`SQL Error: ${errorResult.error.message}`);
        }

        console.log('Tables created or verified successfully');

        // Verify tables exist
        await verifyTables(apiUrl, tursoApiToken);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
      setIsLoading(false);
    }
  };

  // Function to verify tables exist
  const verifyTables = async (apiUrl: string, apiToken: string) => {
    try {
      console.log('Verifying tables exist...');

      const verifyResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: {
                sql: "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('memories', 'tableconfig')"
              }
            }
          ]
        })
      });

      const verifyText = await verifyResponse.text();

      try {
        const verifyData = JSON.parse(verifyText);

        // Check if the tables exist in the verification response
        if (verifyData.results &&
            verifyData.results[0] &&
            verifyData.results[0].type === 'success' &&
            verifyData.results[0].rows) {

          const tableNames = verifyData.results[0].rows.map(row => row.name);
          console.log('Found tables:', tableNames);

          if (tableNames.includes('memories')) {
            console.log('✅ Memories table verified to exist');
          } else {
            console.log('⚠️ Memories table not found');
          }

          if (tableNames.includes('tableconfig')) {
            console.log('✅ Tableconfig table verified to exist');
          } else {
            console.log('⚠️ Tableconfig table not found');
          }
        } else {
          console.log('⚠️ No tables found in verification query');
        }
      } catch (parseError) {
        console.error('Error parsing verification response:', parseError);
      }
    } catch (verifyError) {
      console.error('Error verifying tables:', verifyError);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingCompleted,
        currentStep,
        isLoading,
        userName,
        profileData, // Add profileData to context value
        completeOnboarding,
        updateOnboardingStep,
        updateUserName,
        updateTursoDatabase,
        ensureMemoriesTable,
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

// Add default export for the OnboardingProvider
export default OnboardingProvider;
