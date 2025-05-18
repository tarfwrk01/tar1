import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { uploadProductImage } from '../../../services/R2StorageService';

type UploadedImage = {
  id: string;
  url: string;
};

interface ImageUploaderProps {
  images: string;
  onImagesChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onImagesChange }: ImageUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => {
    // Parse the JSON string of images into an array of UploadedImage objects
    try {
      const parsedImages = JSON.parse(images);
      if (Array.isArray(parsedImages)) {
        return parsedImages.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
        }));
      }
      return [];
    } catch (e) {
      return [];
    }
  });

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

      // Upload the image to R2 storage
      const publicUrl = await uploadProductImage(imageUri);

      // Add the uploaded image to the list
      const newImage: UploadedImage = {
        id: Date.now().toString(),
        url: publicUrl,
      };

      const updatedImages = [...uploadedImages, newImage];
      setUploadedImages(updatedImages);

      // Update the parent component with the new images array
      onImagesChange(updatedImages.map(img => img.url));

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

  // Remove an image from the list
  const removeImage = (id: string) => {
    const updatedImages = uploadedImages.filter(img => img.id !== id);
    setUploadedImages(updatedImages);

    // Update the parent component with the new images array
    onImagesChange(updatedImages.map(img => img.url));
  };

  // Render an uploaded image item
  const renderImageItem = ({ item }: { item: UploadedImage }) => (
    <View style={styles.imageItem}>
      <Image
        source={{ uri: item.url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Images</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={pickImage}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>Add Image</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.imageGrid}>
        {uploadedImages.length > 0 ? (
          uploadedImages.map((item) => (
            <React.Fragment key={item.id}>
              {renderImageItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No images added yet</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  imageItem: {
    position: 'relative',
    margin: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
});
