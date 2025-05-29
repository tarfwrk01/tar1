import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
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
      const parsedImages = JSON.parse(images || '[]');
      if (Array.isArray(parsedImages)) {
        return parsedImages.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
        }));
      }
      return [];
    } catch (e) {
      console.log('Error parsing images:', e);
      return [];
    }
  });

  // Update uploadedImages when images prop changes
  React.useEffect(() => {
    console.log('ImageUploader: images prop changed:', images);
    console.log('ImageUploader: images prop type:', typeof images);
    try {
      const parsedImages = JSON.parse(images || '[]');
      console.log('ImageUploader: parsed images:', parsedImages);
      console.log('ImageUploader: parsed images type:', typeof parsedImages);
      console.log('ImageUploader: is array:', Array.isArray(parsedImages));
      if (Array.isArray(parsedImages)) {
        const newImages = parsedImages.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
        }));
        console.log('ImageUploader: setting uploaded images:', newImages);
        setUploadedImages(newImages);
      } else {
        console.log('ImageUploader: parsed images is not an array, setting empty array');
        setUploadedImages([]);
      }
    } catch (e) {
      console.log('Error parsing images in useEffect:', e);
      console.log('ImageUploader: setting empty array due to parse error');
      setUploadedImages([]);
    }
  }, [images]);

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

  // Render an uploaded image tile
  const renderImageTile = (item: UploadedImage) => (
    <View key={item.id} style={styles.imageTile}>
      <Image
        source={{ uri: item.url }}
        style={styles.tileImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(item.id)}
      >
        <Ionicons name="close-circle" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  // Render add image tile
  const renderAddTile = () => (
    <TouchableOpacity
      style={styles.addTile}
      onPress={pickImage}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#666" />
      ) : (
        <Ionicons name="add" size={32} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tilesGrid}>
        {/* Add tile always comes first */}
        {renderAddTile()}

        {/* Render existing image tiles */}
        {uploadedImages.map((item) => renderImageTile(item))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addTile: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  imageTile: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
