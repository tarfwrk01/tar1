import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useImageCache } from '../services/imageCacheService';

interface OptimizedImageProps {
  source: string | ImageSourcePropType;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  cache?: boolean;
  preload?: boolean;
  fallbackSource?: string | ImageSourcePropType;
  blurRadius?: number;
  fadeDuration?: number;
}

/**
 * Optimized image component with caching and performance enhancements
 */
const OptimizedImage = memo(({
  source,
  style,
  containerStyle,
  placeholder,
  errorPlaceholder,
  loadingIndicator,
  resizeMode = 'cover',
  onLoad,
  onError,
  onLoadStart,
  onLoadEnd,
  cache = true,
  preload = false,
  fallbackSource,
  blurRadius,
  fadeDuration = 300,
}: OptimizedImageProps) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!fadeDuration);
  
  const { getCachedUri, cacheImage } = useImageCache();

  // Get the source URI
  const getSourceUri = useCallback(() => {
    if (typeof source === 'string') {
      return source;
    }
    if (source && typeof source === 'object' && 'uri' in source) {
      return source.uri;
    }
    return null;
  }, [source]);

  // Load image with caching
  useEffect(() => {
    const loadImage = async () => {
      const uri = getSourceUri();
      if (!uri) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        
        if (cache && uri.startsWith('http')) {
          // Use cached version if available
          const cachedUri = await getCachedUri(uri);
          setImageUri(cachedUri);
          
          // Preload/cache the image if needed
          if (preload) {
            cacheImage(uri);
          }
        } else {
          setImageUri(uri);
        }
      } catch (error) {
        console.error('Failed to load image:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [source, cache, preload, getCachedUri, cacheImage, getSourceUri]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    
    if (fadeDuration > 0) {
      setTimeout(() => setIsVisible(true), 50);
    }
    
    onLoad?.();
  }, [onLoad, fadeDuration]);

  // Handle image load error
  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback source if available
    if (fallbackSource && imageUri !== getSourceUri()) {
      const fallbackUri = typeof fallbackSource === 'string' 
        ? fallbackSource 
        : fallbackSource.uri;
      if (fallbackUri) {
        setImageUri(fallbackUri);
        setHasError(false);
        setIsLoading(true);
        return;
      }
    }
    
    onError?.(error);
  }, [fallbackSource, imageUri, getSourceUri, onError]);

  // Handle load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    onLoadStart?.();
  }, [onLoadStart]);

  // Handle load end
  const handleLoadEnd = useCallback(() => {
    onLoadEnd?.();
  }, [onLoadEnd]);

  // Default placeholder
  const defaultPlaceholder = (
    <View style={[styles.placeholder, style]}>
      <Ionicons name="image-outline" size={24} color="#999" />
    </View>
  );

  // Default error placeholder
  const defaultErrorPlaceholder = (
    <View style={[styles.placeholder, styles.errorPlaceholder, style]}>
      <Ionicons name="alert-circle-outline" size={24} color="#d32f2f" />
    </View>
  );

  // Default loading indicator
  const defaultLoadingIndicator = (
    <View style={[styles.placeholder, style]}>
      <ActivityIndicator size="small" color="#0066CC" />
    </View>
  );

  // Render loading state
  if (isLoading && !imageUri) {
    return (
      <View style={[styles.container, containerStyle]}>
        {loadingIndicator || defaultLoadingIndicator}
      </View>
    );
  }

  // Render error state
  if (hasError) {
    return (
      <View style={[styles.container, containerStyle]}>
        {errorPlaceholder || defaultErrorPlaceholder}
      </View>
    );
  }

  // Render image
  if (!imageUri) {
    return (
      <View style={[styles.container, containerStyle]}>
        {placeholder || defaultPlaceholder}
      </View>
    );
  }

  const imageSource = typeof source === 'string' 
    ? { uri: imageUri }
    : { ...source, uri: imageUri };

  return (
    <View style={[styles.container, containerStyle]}>
      {isLoading && (loadingIndicator || defaultLoadingIndicator)}
      
      <Image
        source={imageSource}
        style={[
          style,
          !isVisible && fadeDuration > 0 && { opacity: 0 },
          isVisible && fadeDuration > 0 && styles.fadeIn,
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        blurRadius={blurRadius}
        // Performance optimizations
        progressiveRenderingEnabled={true}
        removeClippedSubviews={true}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  errorPlaceholder: {
    backgroundColor: '#ffebee',
  },
  fadeIn: {
    opacity: 1,
  },
});

export default OptimizedImage;

/**
 * Specialized image components for common use cases
 */

export const ProductImage = memo(({ 
  source, 
  size = 100, 
  ...props 
}: OptimizedImageProps & { size?: number }) => (
  <OptimizedImage
    source={source}
    style={{ width: size, height: size, borderRadius: 8 }}
    resizeMode="cover"
    cache={true}
    preload={true}
    {...props}
  />
));

export const ThumbnailImage = memo(({ 
  source, 
  size = 50, 
  ...props 
}: OptimizedImageProps & { size?: number }) => (
  <OptimizedImage
    source={source}
    style={{ width: size, height: size, borderRadius: 4 }}
    resizeMode="cover"
    cache={true}
    fadeDuration={200}
    {...props}
  />
));

export const AvatarImage = memo(({ 
  source, 
  size = 40, 
  ...props 
}: OptimizedImageProps & { size?: number }) => (
  <OptimizedImage
    source={source}
    style={{ 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    }}
    resizeMode="cover"
    cache={true}
    {...props}
  />
));

export const HeroImage = memo(({ 
  source, 
  aspectRatio = 16/9, 
  ...props 
}: OptimizedImageProps & { aspectRatio?: number }) => (
  <OptimizedImage
    source={source}
    style={{ 
      width: '100%', 
      aspectRatio,
      borderRadius: 12,
    }}
    resizeMode="cover"
    cache={true}
    preload={true}
    fadeDuration={500}
    {...props}
  />
));
