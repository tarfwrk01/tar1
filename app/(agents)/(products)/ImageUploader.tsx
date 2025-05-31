import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [showOptionsDrawer, setShowOptionsDrawer] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(() => {
    // Parse the JSON string of images into an array of UploadedImage objects
    try {
      const parsedImages = JSON.parse(images || '[]');
      if (Array.isArray(parsedImages)) {
        // Filter out empty strings and null values
        const validImages = parsedImages.filter((url: string) => url && url.trim() !== '');
        return validImages.map((url: string, index: number) => ({
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
        // Filter out empty strings and null values
        const validImages = parsedImages.filter((url: string) => url && url.trim() !== '');
        console.log('ImageUploader: valid images after filtering:', validImages);
        const newImages = validImages.map((url: string, index: number) => ({
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

  // Handle image tap to show options drawer
  const handleImageTap = (image: UploadedImage) => {
    setSelectedImage(image);
    setShowOptionsDrawer(true);
  };

  // Handle change image option
  const handleChangeImage = async () => {
    setShowOptionsDrawer(false);
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && selectedImage) {
        const selectedImageAsset = result.assets[0];
        await replaceImage(selectedImage.id, selectedImageAsset.uri);
      }
    } catch (error) {
      console.error('Error picking replacement image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Replace an existing image
  const replaceImage = async (id: string, imageUri: string) => {
    try {
      setIsLoading(true);

      // Upload the new image to R2 storage
      const publicUrl = await uploadProductImage(imageUri);

      // Update the image in the list
      const updatedImages = uploadedImages.map(img =>
        img.id === id ? { ...img, url: publicUrl } : img
      );
      setUploadedImages(updatedImages);

      // Update the parent component with the new images array
      onImagesChange(updatedImages.map(img => img.url));

    } catch (error) {
      console.error('Error replacing image:', error);
      Alert.alert(
        'Error',
        'Failed to replace image. Please try again.',
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
    setShowOptionsDrawer(false);
  };

  // Close the options drawer
  const closeOptionsDrawer = () => {
    setShowOptionsDrawer(false);
    setSelectedImage(null);
  };

  // Render an uploaded image tile
  const renderImageTile = (item: UploadedImage) => (
    <TouchableOpacity
      key={item.id}
      style={styles.imageTile}
      onPress={() => handleImageTap(item)}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.tileImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
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
        {/* Render existing image tiles first */}
        {uploadedImages.map((item) => renderImageTile(item))}

        {/* Add tile comes after existing images */}
        {renderAddTile()}
      </View>

      {/* Bottom Options Drawer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showOptionsDrawer}
        onRequestClose={closeOptionsDrawer}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            onPress={closeOptionsDrawer}
          />
          <View style={styles.drawerContent}>
            <TouchableOpacity
              style={styles.drawerOption}
              onPress={handleChangeImage}
            >
              <Text style={styles.drawerOptionText}>Change</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerOption, styles.deleteOption]}
              onPress={() => selectedImage && removeImage(selectedImage.id)}
            >
              <Text style={[styles.drawerOptionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerOption, styles.closeOption]}
              onPress={closeOptionsDrawer}
            >
              <Text style={styles.drawerOptionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
  },
  addTile: {
    width: '32%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageTile: {
    width: '32%',
    aspectRatio: 1,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  // Bottom drawer styles
  drawerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  drawerOption: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  drawerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
    paddingTop: 16,
  },
  deleteText: {
    color: '#ff4444',
  },
  closeOption: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
    paddingTop: 16,
  },
});
