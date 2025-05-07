import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

  // Get email from local search params or state
  const params = useLocalSearchParams<{ email: string }>();

  // Get email from params only once on mount to prevent refreshing
  useEffect(() => {
    console.log('Verify screen mounted, params:', params);
    if (params.email && !email) {
      const emailParam = typeof params.email === 'string' ? params.email : '';
      console.log('Setting email from params:', emailParam);
      setEmail(emailParam);
    }
  }, [params.email, email]);

  const handleVerify = async () => {
    console.log('Verify button pressed');
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back to the login screen.');
      router.replace('/(auth)/login');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // For testing, any 6-digit code will work
      console.log('Verifying code:', code, 'for email:', email);
      await verifyCode(email, code);

      // The auth context will handle navigation
    } catch (err) {
      console.error('Error in handleVerify:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    console.log('Resend button pressed');
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please go back to the login screen.');
      router.replace('/(auth)/login');
      return;
    }

    try {
      setIsSubmitting(true);
      // Use the auth context to resend the code
      await signIn(email);
      Alert.alert('Success', 'A new code has been sent to your email.');
    } catch (error) {
      console.error('Error resending code:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
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

          <View style={styles.form}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError('');
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              maxLength={6}
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
          </View>

          <TouchableOpacity onPress={handleResend} disabled={isSubmitting}>
            <Text style={styles.resendText}>
              Didn't receive a code? <Text style={styles.resendLink}>Resend</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
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
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#99c2e8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  resendText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
  resendLink: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 16,
  },
});
