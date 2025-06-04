import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';
import { listObjects, uploadImageWithCachedCredentials } from '../../services/R2StorageService';
import { useAuth } from '../context/auth';

type UploadedImage = {
  id: string;
  url: string;
  filename: string;
  timestamp: Date;
};

export default function R2UploadScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isListingObjects, setIsListingObjects] = useState(false);

  // Request permission to access the media library
  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your media library to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Pick an image from the media library
  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadImage(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Upload an image to R2 storage
  const uploadImage = async (imageUri: string) => {
    try {
      setIsLoading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Upload the image to R2 storage using cached credentials
      const publicUrl = await uploadImageWithCachedCredentials(imageUri, user.id);

      // Add the uploaded image to the list
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        url: publicUrl,
        filename: publicUrl.split('/').pop() || 'unknown',
        timestamp: new Date(),
      };

      setUploadedImages(prevImages => [newImage, ...prevImages]);

      Alert.alert(
        'Success',
        'Image uploaded successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Error',
        'Failed to upload image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // List objects in the R2 bucket
  const fetchStoredObjects = async () => {
    try {
      setIsListingObjects(true);

      // List objects in the products/ prefix
      const objects = await listObjects('products/');

      if (objects && objects.length > 0) {
        // Convert objects to UploadedImage format
        const images: UploadedImage[] = objects.map(obj => ({
          id: obj.ETag || Date.now().toString(),
          url: `https://tarapp-pqdhr.sevalla.storage/${obj.Key}`,
          filename: obj.Key?.split('/').pop() || 'unknown',
          timestamp: obj.LastModified || new Date(),
        }));

        setUploadedImages(images);
      } else {
        setUploadedImages([]);
        Alert.alert(
          'No Images',
          'No images found in storage.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error listing objects:', error);
      Alert.alert(
        'Error',
        'Failed to list stored images. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsListingObjects(false);
    }
  };

  // Copy image URL to clipboard
  const copyUrlToClipboard = (url: string) => {
    Clipboard.setString(url);
    Alert.alert('Copied', 'Image URL copied to clipboard!');
  };

  // Render an uploaded image item
  const renderImageItem = ({ item }: { item: UploadedImage }) => (
    <View style={styles.imageItem}>
      <Image
        source={{ uri: item.url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.imageInfo}>
        <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
          {item.filename}
        </Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleString()}
        </Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyUrlToClipboard(item.url)}
        >
          <Ionicons name="copy-outline" size={16} color="#0066CC" />
          <Text style={styles.copyText}>Copy URL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty list message
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No uploaded images</Text>
      <Text style={styles.emptySubText}>
        Tap the upload button to add images
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="R2 Upload" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>R2 Storage Upload</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchStoredObjects}
            disabled={isListingObjects}
          >
            {isListingObjects ? (
              <ActivityIndicator size="small" color="#0066CC" />
            ) : (
              <Ionicons name="refresh" size={24} color="#0066CC" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={uploadedImages}
        renderItem={renderImageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  imageItem: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  imageInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  filename: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyText: {
    color: '#0066CC',
    marginLeft: 4,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
  },
});
