import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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

interface SingleImageUploaderProps {
  imageUrl: string;
  onImageChange: (imageUrl: string) => void;
}

export default function SingleImageUploader({ imageUrl, onImageChange }: SingleImageUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Parse the image URL from the JSON string if needed
    try {
      if (imageUrl) {
        const parsedImages = JSON.parse(imageUrl);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          setCurrentImageUrl(parsedImages[0]);
        } else if (typeof parsedImages === 'string') {
          setCurrentImageUrl(parsedImages);
        }
      }
    } catch (e) {
      // If it's not a JSON string, use it directly
      if (imageUrl && imageUrl !== '[]') {
        setCurrentImageUrl(imageUrl);
      }
    }
  }, [imageUrl]);

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
        aspect: [1, 1],
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
    
    // Close the options drawer if it was open
    setShowOptions(false);
  };

  // Upload an image to R2 storage
  const uploadImage = async (imageUri: string) => {
    try {
      setIsLoading(true);

      // Upload the image to R2 storage
      const publicUrl = await uploadProductImage(imageUri);
      
      // Update the state with the new image URL
      setCurrentImageUrl(publicUrl);

      // Update the parent component with the new image URL
      // Wrap in an array and stringify to maintain compatibility
      onImageChange(JSON.stringify([publicUrl]));

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

  // Remove the current image
  const removeImage = () => {
    setCurrentImageUrl(null);
    onImageChange('[]');
    setShowOptions(false);
  };

  // Close the options drawer
  const closeDrawer = () => {
    setShowOptions(false);
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Uploading image...</Text>
        </View>
      ) : currentImageUrl ? (
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Image
              source={{ uri: currentImageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
          
          {/* Simple Bottom Drawer with transparent background */}
          <Modal
            visible={showOptions}
            transparent={true}
            animationType="slide"
            onRequestClose={closeDrawer}
          >
            <View style={styles.modalContainer}>
              <View style={styles.optionsContainer}>
                <TouchableOpacity 
                  style={styles.optionButton} 
                  onPress={closeDrawer}
                >
                  <Text style={styles.optionText}>Close</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionButton} 
                  onPress={pickImage}
                >
                  <Text style={styles.optionText}>Change</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionButton} 
                  onPress={removeImage}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.emptyContainer}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Tap to add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  emptyContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderWidth: 1,
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent', // Changed to transparentrent',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  optionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#0066CC',
  },
  removeText: {
    fontSize: 16,
    color: '#ff4444',
  },
});
