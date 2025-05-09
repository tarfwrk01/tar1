import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const { signIn } = useAuth();
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use a single ref for submission state
  const isSubmittingRef = useRef(false);

  // Track component mounted state
  const isMountedRef = useRef(true);

  // Set up and clean up component lifecycle
  useEffect(() => {
    // Component mounted
    console.log('[LOGIN] Screen mounted');
    isMountedRef.current = true;

    // Component cleanup
    return () => {
      console.log('[LOGIN] Screen unmounting');
      isMountedRef.current = false;
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
    console.log('[LOGIN] Sign in button pressed');

    // Prevent multiple submissions
    if (isSubmitting || isSubmittingRef.current) {
      console.log('[LOGIN] Already submitting, ignoring additional press');
      return;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Lock submission state
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setEmailError('');

    try {
      console.log('[LOGIN] Calling signIn with email:', email);

      // Call signIn and let auth context handle navigation
      await signIn(email);

      console.log('[LOGIN] signIn completed successfully');

      // Don't reset state - component will unmount during navigation
    } catch (err) {
      console.error('[LOGIN] Error in handleSignIn:', err);

      // Show error to user
      if (isMountedRef.current) {
        setEmailError('Something went wrong. Please try again.');
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
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Magic Code</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.infoText}>
            We'll send a magic code to your email that you can use to sign in.
          </Text>
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
    fontSize: 16,
    marginBottom: 24,
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
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});
