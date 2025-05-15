import { useOnboarding } from '@/app/context/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MediaItem = {
  id: number;
  parentid: number;
  type: string;
  url: string;
  order: number;
};

export default function MediaScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const { profileData } = useOnboarding();

  const handleBackPress = () => {
    router.back();
  };

  const fetchMedia = async () => {
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

      // Fetch media
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
                sql: "SELECT id, parentid, type, url, \"order\" FROM media ORDER BY parentid, \"order\" LIMIT 50"
              }
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0] && data.results[0].rows) {
          setMediaItems(data.results[0].rows);
        } else {
          setMediaItems([]);
        }
      } else {
        console.error('Failed to fetch media:', await response.text());
        Alert.alert(
          'Error',
          'Failed to fetch media. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching media. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch media on component mount
  React.useEffect(() => {
    fetchMedia();
  }, []);

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.mediaItem}>
      {item.url && item.type === 'image' ? (
        <View style={styles.mediaImageContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.mediaPlaceholder}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaType}>{item.type || 'Unknown type'}</Text>
        <Text style={styles.mediaUrl} numberOfLines={1} ellipsizeMode="middle">{item.url || 'No URL'}</Text>
        <Text style={styles.mediaParent}>Parent ID: {item.parentid}, Order: {item.order}</Text>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No media found</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMedia}>
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
        <Text style={styles.headerTitle}>Media</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          renderItem={renderMediaItem}
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
  mediaItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mediaImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mediaType: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaUrl: {
    fontSize: 14,
    color: '#0066CC',
    marginBottom: 4,
  },
  mediaParent: {
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
