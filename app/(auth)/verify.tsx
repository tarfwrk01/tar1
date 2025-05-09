import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/auth';

export default function VerifyScreen() {
  const { verifyCode, signIn } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes in seconds
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  // Use refs for better state management
  const hasLoggedMountRef = useRef(false);
  const hasSetEmailRef = useRef(false);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  // Get email from local search params or state
  const params = useLocalSearchParams<{ email: string }>();

  // Component lifecycle management
  useEffect(() => {
    // Component mounted
    console.log('[VERIFY] Screen mounted');
    isMountedRef.current = true;

    // Component cleanup
    return () => {
      console.log('[VERIFY] Screen unmounting');
      isMountedRef.current = false;
    };
  }, []);

  // Start countdown timer when component mounts
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown > 0) {
      timer = setInterval(() => {
        if (isMountedRef.current) {
          setCountdown(prev => {
            const newValue = prev - 1;
            if (newValue <= 0) {
              setIsResendDisabled(false);
              clearInterval(timer);
              return 0;
            }
            return newValue;
          });
        }
      }, 1000);
    } else {
      setIsResendDisabled(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Get email from params only once on mount to prevent refreshing
  useEffect(() => {
    console.log('[VERIFY] Screen params received:', params);

    // Only set email once to prevent re-renders
    if (!hasSetEmailRef.current && params.email) {
      const emailParam = typeof params.email === 'string' ? params.email : '';
      console.log('[VERIFY] Setting email from params:', emailParam);
      setEmail(emailParam);
      hasSetEmailRef.current = true;
    }
  }, []);

  const handleVerify = async () => {
    console.log('[VERIFY] Verify button pressed');

    // Prevent multiple submissions
    if (isSubmitting || isSubmittingRef.current) {
      console.log('[VERIFY] Already submitting verification, ignoring additional press');
      return;
    }

    // Validate code
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    // Validate email
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back to the login screen.');
      router.replace('/(auth)/login');
      return;
    }

    // Lock submission state
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');

    try {
      // Clean up the code
      const cleanCode = code.trim().replace(/\s+/g, '');
      console.log('[VERIFY] Verifying code for email:', email);

      // Call verifyCode and let auth context handle navigation
      const success = await verifyCode(email, cleanCode);
      console.log('[VERIFY] Verification result:', success);

      if (!success) {
        // If verification failed but didn't throw an error
        setError('Invalid code. Please check and try again.');

        // Reset state on failure
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
        isSubmittingRef.current = false;
      }
      // Don't reset state on success - component will unmount
    } catch (err) {
      console.error('[VERIFY] Error in handleVerify:', err);

      // Show error to user
      if (isMountedRef.current) {
        setError('Something went wrong. Please try again.');
        setIsSubmitting(false);
      }

      // Reset lock
      isSubmittingRef.current = false;
    }
  };

  const handleResend = async () => {
    console.log('[VERIFY] Resend button pressed');

    // Prevent multiple submissions
    if (isSubmitting || isSubmittingRef.current) {
      console.log('[VERIFY] Already submitting resend, ignoring additional press');
      return;
    }

    // Validate email
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back to the login screen.');
      router.replace('/(auth)/login');
      return;
    }

    // Don't allow resend if countdown is still active
    if (isResendDisabled) {
      Alert.alert('Please wait', `You can request a new code in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`);
      return;
    }

    // Lock submission state
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      console.log('[VERIFY] Resending code to email:', email);

      // Use the auth context to resend the code with skipNavigation=true
      // This prevents the navigation loop when resending from verify screen
      await signIn(email, true);

      console.log('[VERIFY] Code resent successfully');

      // Reset countdown and disable resend button
      if (isMountedRef.current) {
        setCountdown(120); // 2 minutes
        setIsResendDisabled(true);
        setIsSubmitting(false);
        Alert.alert('Success', 'A new code has been sent to your email.');
      }

      // Reset lock
      isSubmittingRef.current = false;
    } catch (error) {
      console.error('[VERIFY] Error resending code:', error);

      // Show error to user
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to resend code. Please try again.');
        setIsSubmitting(false);
      }

      // Reset lock
      isSubmittingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            Enter the code sent to {email || 'your email'}
          </Text>

          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={(text) => {
              // Only allow digits
              const digitsOnly = text.replace(/[^0-9]/g, '');
              setCode(digitsOnly);
              setError('');
            }}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            maxLength={6}
            textContentType="oneTimeCode" // For iOS to suggest codes from SMS
            autoComplete="sms-otp" // For Android to suggest codes from SMS
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={isSubmitting || isResendDisabled}
          >
            <Text style={styles.resendText}>
              Didn't receive a code?{' '}
              {isResendDisabled ? (
                <Text style={styles.countdownText}>
                  Wait {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </Text>
              ) : (
                <Text style={styles.resendLink}>Resend</Text>
              )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
            disabled={isSubmitting}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    color: '#000',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 12,
    fontSize: 18,
    marginBottom: 24,
    letterSpacing: 2,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#99c2e8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    fontSize: 14,
  },
  resendText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  resendLink: {
    color: '#0066CC',
    fontWeight: '600',
  },
  countdownText: {
    color: '#888',
    fontWeight: '500',
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 16,
  },
});
