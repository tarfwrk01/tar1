import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';
import { useAuth } from '../context/auth';

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Back button pressed in profile screen');
      router.replace('/(primary)');
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </SafeAreaView>
    );
  }

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Profile" />

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          {user.name && (
            <View style={styles.profileInfo}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.value}>{user.id}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log('Sign out button pressed');
            signOut();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(primary)')}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
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
  profileInfo: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
  },
});
