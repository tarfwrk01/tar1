import { useOnboarding } from '@/app/context/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Metafield = {
  id: number;
  parentid: number;
  title: string;
  value: string;
};

export default function MetafieldsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [metafields, setMetafields] = useState<Metafield[]>([]);
  const { profileData } = useOnboarding();

  const handleBackPress = () => {
    router.back();
  };

  const fetchMetafields = async () => {
    try {
      setIsLoading(true);

      // Get the profile data
      const profile = profileData?.profile?.[0];

      if (!profile || !profile.tursoDbName || !profile.tursoApiToken) {
        throw new Error('Missing database credentials');
      }

      const { tursoDbName, tursoApiToken } = profile;

      // Construct API URL
      const apiUrl = `https://${tursoDbName}-tarframework.aws-eu-west-1.turso.io/v2/pipeline`;

      // Fetch metafields
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tursoApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: {
                sql: "SELECT id, parentid, title, value FROM metafields ORDER BY parentid, title LIMIT 50"
              }
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0] && data.results[0].rows) {
          setMetafields(data.results[0].rows);
        } else {
          setMetafields([]);
        }
      } else {
        console.error('Failed to fetch metafields:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch metafields. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching metafields:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching metafields. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch metafields on component mount
  React.useEffect(() => {
    fetchMetafields();
  }, []);

  const renderMetafieldItem = ({ item }: { item: Metafield }) => (
    <View style={styles.metafieldItem}>
      <Text style={styles.metafieldTitle}>{item.title}</Text>
      <Text style={styles.metafieldValue}>{item.value}</Text>
      <Text style={styles.metafieldParent}>Parent ID: {item.parentid}</Text>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No metafields found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMetafields}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Metafields</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading metafields...</Text>
        </View>
      ) : (
        <FlatList
          data={metafields}
          renderItem={renderMetafieldItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  metafieldItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metafieldTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  metafieldValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  metafieldParent: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
