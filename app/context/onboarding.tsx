import { instant } from '@/lib/instantdb';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
    cacheCredentials,
    TursoCredentials
} from '../utils/credentialCache';
import { useAuth } from './auth';

// Import additional cache functions
const { getCachedCredentials, isOnboardingCompletedFromCache } = require('../utils/credentialCache');

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
  const isFirstLoad = React.useRef(true);
  const navigationInProgress = React.useRef(false);
  const lastNavigationTime = React.useRef(0);
  const profileInitialized = React.useRef(false);
  const onboardingTransitionInProgress = React.useRef(false);

  // Cache-first approach for profile data
  const [profileData, setProfileData] = useState<any>(null);
  const [profileError, setProfileError] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [cacheChecked, setCacheChecked] = useState<boolean>(false);

  // Cache-first profile data loading - only when needed
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user || cacheChecked) return;

      console.log('[OnboardingCache] Loading profile data for user:', user.id);
      setProfileLoading(true);

      try {
        // First, try to get data from cache
        const cachedCredentials = await getCachedCredentials(user.id);

        if (cachedCredentials) {
          console.log('[OnboardingCache] Using cached profile data - skipping InstantDB query');
          // Create profile data structure from cache
          const cachedProfileData = {
            profile: [{
              id: user.id,
              userId: user.id,
              onboardingCompleted: cachedCredentials.onboardingCompleted,
              name: cachedCredentials.userName,
              tursoDbName: cachedCredentials.tursoDbName,
              tursoApiToken: cachedCredentials.tursoApiToken
            }]
          };

          setProfileData(cachedProfileData);
          setProfileLoading(false);
          setCacheChecked(true);
          return;
        }

        // Only query InstantDB if no cache exists (new users or after logout)
        console.log('[OnboardingCache] No cache found, querying InstantDB for new user');
        const { data, error } = await instant.query({
          profile: {
            $: {
              where: { userId: user.id },
              fields: ['onboardingCompleted', 'name', 'tursoDbName', 'tursoApiToken']
            }
          }
        });

        if (error) {
          console.error('[OnboardingCache] Error querying InstantDB:', error);
          setProfileError(error);
        } else {
          console.log('[OnboardingCache] InstantDB data loaded for new user');
          setProfileData(data);

          // Cache the data if it exists and onboarding is completed
          if (data?.profile?.[0]?.onboardingCompleted && data.profile[0].tursoDbName && data.profile[0].tursoApiToken) {
            const credentialsToCache = {
              tursoDbName: data.profile[0].tursoDbName,
              tursoApiToken: data.profile[0].tursoApiToken,
              userId: user.id,
              onboardingCompleted: data.profile[0].onboardingCompleted,
              userName: data.profile[0].name
            };
            await cacheCredentials(credentialsToCache);
            console.log('[OnboardingCache] Profile data cached for future use');
          }
        }

      } catch (error) {
        console.error('[OnboardingCache] Error loading profile data:', error);
        setProfileError(error);
      } finally {
        setProfileLoading(false);
        setCacheChecked(true);
      }
    };

    loadProfileData();
  }, [user, cacheChecked]);

  // Log any errors with the profile query
  useEffect(() => {
    if (profileError) {
      console.error('Error querying profile data:', profileError);
    }
  }, [profileError]);

  // Special effect to handle first load with cache-first approach
  useEffect(() => {
    const handleFirstLoad = async () => {
      if (user && isFirstLoad.current) {
        console.log('[OnboardingCache] FIRST LOAD with user:', user.id);
        isFirstLoad.current = false;

        // Start with loading state until we can determine the correct status
        setIsLoading(true);

        // Try to get onboarding status from cache first
        const cachedOnboardingStatus = await isOnboardingCompletedFromCache(user.id);
        if (cachedOnboardingStatus !== null) {
          console.log('[OnboardingCache] First load - using cached onboarding status:', cachedOnboardingStatus);
          setIsOnboardingCompleted(cachedOnboardingStatus);

          // Also try to get cached user name
          const cachedCredentials = await getCachedCredentials(user.id);
          if (cachedCredentials?.userName) {
            setUserName(cachedCredentials.userName);
            console.log('[OnboardingCache] First load - using cached user name:', cachedCredentials.userName);
          }

          setIsLoading(false);
        } else {
          console.log('[OnboardingCache] First load - no cache found, will determine status from profile data');
          // Will be handled by the profile data loading effect
        }

        // Reset the profile initialization flag for new user sessions
        profileInitialized.current = false;
      }
    };

    handleFirstLoad();
  }, [user]);

  // Cache-first profile state management - only handle new users who need initialization
  useEffect(() => {
    const handleProfileState = async () => {
      if (!user || !cacheChecked) return;

      console.log('[OnboardingCache] Profile state check - user:', user.id, 'cacheChecked:', cacheChecked);

      // If we have cached data, we're done - no need to process profile data
      const cachedCredentials = await getCachedCredentials(user.id);
      if (cachedCredentials) {
        console.log('[OnboardingCache] Cache exists, skipping profile data processing');
        return;
      }

      // Only handle new users who don't have cache and need initialization
      if (!profileData || !profileData.profile || profileData.profile.length === 0) {
        if (!profileInitialized.current) {
          console.log('[OnboardingCache] New user detected, initializing profile data');
          profileInitialized.current = true;
          setIsOnboardingCompleted(false);
          initializeOnboardingData();
        }
      }
    };

    handleProfileState();
  }, [user, cacheChecked, profileData]);

  // Handle navigation based on cached/profile data with cache-first approach
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

      console.log('[NavigationCache] Navigation effect - isLoading:', isLoading, 'user:', user?.id, 'segments:', segments);

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

      // Cache-first onboarding status check
      let hasCompletedOnboarding = false;

      // First try to get onboarding status from cache
      const cachedOnboardingStatus = await isOnboardingCompletedFromCache(user.id);
      if (cachedOnboardingStatus !== null) {
        console.log('[NavigationCache] Using cached onboarding status:', cachedOnboardingStatus);
        hasCompletedOnboarding = cachedOnboardingStatus;
      } else {
        // Fall back to profile data if no cache
        hasCompletedOnboarding =
          profileData &&
          profileData.profile &&
          profileData.profile.length > 0 &&
          profileData.profile[0].onboardingCompleted === true;

        console.log('[NavigationCache] Using profile data onboarding status:', hasCompletedOnboarding);
      }

      // Update local state to match cached/database status (for UI consistency)
      if (hasCompletedOnboarding && isOnboardingCompleted !== true) {
        console.log('[NavigationCache] Updating local state to match cached status: onboardingCompleted = true');
        setIsOnboardingCompleted(true);
      }

      // Allow navigation to settings/profile/agents screens even if onboarding is completed
      if (segments[0] === '(settings)' || segments[0] === '(agents)') {
        // Only log once per session when entering agents section to reduce console spam
        if (segments[0] === '(agents)' && !navigationInProgress.current) {
          console.log('[NavigationCache] User is in agents section, using cached credentials for database operations');
        } else if (segments[0] === '(settings)') {
          console.log('[NavigationCache] User is on settings screen, allowing navigation');
        }
        // Reset navigation flags to ensure future navigation works correctly
        navigationInProgress.current = false;
        return;
      }

      // If we're trying to navigate to profile, allow it
      if (segments.join('/').includes('profile')) {
        console.log('[NavigationCache] Navigation to profile detected, allowing navigation');
        navigationInProgress.current = false;
        return;
      }

      // Skip navigation if we're already on the correct screen
      if (
        (segments[0] === '(onboarding)' && !hasCompletedOnboarding) ||
        (segments[0] === '(primary)' && hasCompletedOnboarding)
      ) {
        console.log('[NavigationCache] Already on the correct screen, skipping navigation');
        return;
      }

      // Navigate based on cached/profile onboarding status
      if (hasCompletedOnboarding) {
        // If onboarding is completed, go to primary screen
        // But only if not already on a settings or agents screen
        if (segments[0] !== '(primary)' &&
            segments.join('/').indexOf('(settings)') === -1 &&
            segments.join('/').indexOf('(agents)') === -1) {
          console.log('[NavigationCache] Onboarding completed (from cache/profile), redirecting to primary');
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

        console.log('[NavigationCache] NAVIGATION CHECK: needsOnboarding:', needsOnboarding, 'hasCompletedOnboarding:', hasCompletedOnboarding, 'currentSegment:', segments[0]);

        if (needsOnboarding && segments[0] !== '(onboarding)') {
          console.log('[NavigationCache] User needs onboarding, redirecting to database screen');
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
  }, [user, isLoading, segments, profileData, profileLoading, cacheChecked]);

  // Initialize onboarding data for new users - only creates basic profile without setting onboardingCompleted
  const initializeOnboardingData = async () => {
    try {
      if (!user) {
        console.log('No user to initialize onboarding data for');
        setIsLoading(false);
        return;
      }

      console.log('Checking if user already has completed onboarding in the past');

      // First check the local profileData from the useQuery hook
      if (profileData && profileData.profile && profileData.profile.length > 0) {
        const existingProfile = profileData.profile[0];
        console.log('EXISTING PROFILE CHECK:', existingProfile);

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
