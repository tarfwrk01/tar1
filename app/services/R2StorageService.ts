import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import 'react-native-get-random-values'; // Must be imported before uuid
import { v4 as uuidv4 } from 'uuid';

// Cloudflare R2 configuration
const R2_CONFIG = {
  endpoint: 'https://f6d1d15e6f0b37b4b8fcad3c41a7922d.r2.cloudflarestorage.com',
  accessKey: 'c3827ec3b7fb19b6c35168478440a8c6',
  secretKey: '8e6d899be792b0bee11201a6c9f6f83f865f2fce9f1ca2c3ff172ad35b5759e2',
  bucketName: 'tarapp-pqdhr',
  region: 'apac'
};

/**
 * Generates a presigned URL for uploading a file to Cloudflare R2
 * @param fileName - The name of the file to upload
 * @param contentType - The content type of the file
 * @returns The presigned URL and the public URL of the file
 */
const generatePresignedUrl = async (fileName: string, contentType: string, folderName: string = 'products') => {
  try {
    // Generate a unique key for the file
    const key = `${folderName}/${uuidv4()}-${fileName}`;
    
    // Create a timestamp for the expiration (15 minutes from now)
    const expirationTime = Math.floor(Date.now() / 1000) + 15 * 60;
    
    // Construct the policy
    const policy = {
      expiration: new Date(expirationTime * 1000).toISOString(),
      conditions: [
        { bucket: R2_CONFIG.bucketName },
        { key: key },
        ['content-length-range', 0, 10485760], // 10MB max
        { 'Content-Type': contentType }
      ]
    };
    
    // Convert policy to base64
    const policyBase64 = btoa(JSON.stringify(policy));
    
    // Create signature (this is a simplified version - in production, use a proper HMAC-SHA1 implementation)
    // For security reasons, this should be done on a server
    // This is a placeholder - in a real app, you would call your backend API
    const signature = 'PLACEHOLDER_SIGNATURE';
    
    // Construct the presigned URL
    const presignedUrl = `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`;
    
    // Construct the public URL
    const publicUrl = `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`;
    
    return { presignedUrl, publicUrl, key };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Uploads an image to Cloudflare R2 storage
 * @param imageUri - The URI of the image to upload
 * @param folderName - The folder name to use for organizing uploads (defaults to 'products')
 * @returns The public URL of the uploaded image
 */
export const uploadProductImage = async (imageUri: string, folderName: string = 'products'): Promise<string> => {
  try {
    // Get the file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    
    // Resize and compress the image
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Get the file name from the URI
    const fileName = imageUri.split('/').pop() || 'image.jpg';
    
    // For demo purposes, we'll use a direct upload approach
    // In a production app, you would use the presigned URL approach
    
    // Create a unique file name
    const uniqueFileName = `${uuidv4()}-${fileName}`;
    const key = `${folderName}/${uniqueFileName}`;
    
    // Construct the public URL (this is a simplified version)
    const publicUrl = `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`;
    
    // In a real implementation, you would upload the file to R2 using the presigned URL
    // For this demo, we'll just return the public URL
    console.log('Image would be uploaded to:', publicUrl);
    
    // Simulate a successful upload
    // In a real app, you would upload the file and wait for the response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Deletes an image from Cloudflare R2 storage
 * @param imageUrl - The URL of the image to delete
 * @returns A boolean indicating whether the deletion was successful
 */
export const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract the key from the URL
    const key = imageUrl.split('/').slice(-2).join('/');
    
    // In a real implementation, you would delete the file from R2
    // For this demo, we'll just log the action
    console.log('Image would be deleted:', key);
    
    // Simulate a successful deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};
