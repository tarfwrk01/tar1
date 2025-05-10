import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../context/onboarding';

export default function NameScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { isLoading, updateOnboardingStep, updateUserName } = useOnboarding();
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Reduce animation duration for a faster experience
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300, // Reduced from 800ms to 300ms for faster animation
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      const trimmedName = name.trim();
      console.log('Updating user name to:', trimmedName);

      // Store name in a global variable as a backup
      try {
        global.userName = trimmedName;
        console.log('Name stored in global variable');
      } catch (storageError) {
        console.error('Error storing name in global variable:', storageError);
      }

      await updateUserName(trimmedName);
      console.log('Name updated successfully, updating onboarding step to 2');
      await updateOnboardingStep(2);
      console.log('Onboarding step updated successfully, navigating to database screen');
      router.push('/(onboarding)/database');
    } catch (err) {
      console.error('Error in handleContinue:', err);
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>😊</Text>
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              We'll use this to personalize your experience.
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isLoading}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 16,
    fontSize: 18,
    marginTop: 40,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
