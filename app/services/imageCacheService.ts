import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface CacheEntry {
  uri: string;
  timestamp: number;
  size?: number;
  etag?: string;
}

interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  maxEntries: number;
}

/**
 * Image caching service for better performance
 */
export class ImageCacheService {
  private static instance: ImageCacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private readonly CACHE_KEY = '@image_cache_metadata';
  private readonly CACHE_DIR = 'image_cache';

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 1000,
      ...config,
    };
    this.loadCacheMetadata();
  }

  static getInstance(config?: Partial<CacheConfig>): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService(config);
    }
    return ImageCacheService.instance;
  }

  /**
   * Load cache metadata from AsyncStorage
   */
  private async loadCacheMetadata(): Promise<void> {
    try {
      const metadata = await AsyncStorage.getItem(this.CACHE_KEY);
      if (metadata) {
        const entries = JSON.parse(metadata);
        this.cache = new Map(entries);
        await this.cleanExpiredEntries();
      }
    } catch (error) {
      console.error('Failed to load image cache metadata:', error);
    }
  }

  /**
   * Save cache metadata to AsyncStorage
   */
  private async saveCacheMetadata(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save image cache metadata:', error);
    }
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.removeFromCache(key);
    }
  }

  /**
   * Generate cache key from URL
   */
  private getCacheKey(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached image URI or original URL
   */
  async getCachedImageUri(url: string): Promise<string> {
    if (!url || !url.startsWith('http')) {
      return url; // Return as-is for local images or invalid URLs
    }

    const cacheKey = this.getCacheKey(url);
    const cacheEntry = this.cache.get(cacheKey);

    if (cacheEntry) {
      // Check if cache entry is still valid
      const now = Date.now();
      if (now - cacheEntry.timestamp < this.config.maxAge) {
        return cacheEntry.uri;
      } else {
        // Remove expired entry
        await this.removeFromCache(cacheKey);
      }
    }

    // Return original URL if not cached or expired
    return url;
  }

  /**
   * Cache an image from URL
   */
  async cacheImage(url: string): Promise<string> {
    if (!url || !url.startsWith('http')) {
      return url;
    }

    const cacheKey = this.getCacheKey(url);
    
    // Check if already cached and valid
    const existingEntry = this.cache.get(cacheKey);
    if (existingEntry) {
      const now = Date.now();
      if (now - existingEntry.timestamp < this.config.maxAge) {
        return existingEntry.uri;
      }
    }

    try {
      // For React Native, we'll use the original URL with cache headers
      // In a real implementation, you might want to download and store locally
      const cachedUri = await this.downloadAndStore(url, cacheKey);
      
      const cacheEntry: CacheEntry = {
        uri: cachedUri,
        timestamp: Date.now(),
      };

      this.cache.set(cacheKey, cacheEntry);
      await this.saveCacheMetadata();
      await this.enforceMaxEntries();

      return cachedUri;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return url; // Fallback to original URL
    }
  }

  /**
   * Download and store image (simplified implementation)
   */
  private async downloadAndStore(url: string, cacheKey: string): Promise<string> {
    // In a real implementation, you would:
    // 1. Download the image
    // 2. Store it in the file system
    // 3. Return the local file path
    
    // For now, we'll return the original URL with cache-busting parameters
    // This is a simplified approach that relies on HTTP caching
    return `${url}?cache=${cacheKey}`;
  }

  /**
   * Remove entry from cache
   */
  private async removeFromCache(cacheKey: string): Promise<void> {
    const entry = this.cache.get(cacheKey);
    if (entry) {
      this.cache.delete(cacheKey);
      // In a real implementation, you would also delete the local file
      await this.saveCacheMetadata();
    }
  }

  /**
   * Enforce maximum number of cache entries
   */
  private async enforceMaxEntries(): Promise<void> {
    if (this.cache.size <= this.config.maxEntries) {
      return;
    }

    // Sort by timestamp (oldest first) and remove excess entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, this.cache.size - this.config.maxEntries);
    
    for (const [key] of entriesToRemove) {
      await this.removeFromCache(key);
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
      await AsyncStorage.removeItem(this.CACHE_KEY);
      // In a real implementation, you would also delete all cached files
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    entries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let totalSize = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
      
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      entries: this.cache.size,
      totalSize,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.cacheImage(url));
    await Promise.allSettled(promises);
  }
}

/**
 * Hook for using image cache in React components
 */
export function useImageCache() {
  const cacheService = ImageCacheService.getInstance();

  const getCachedUri = async (url: string): Promise<string> => {
    return cacheService.getCachedImageUri(url);
  };

  const cacheImage = async (url: string): Promise<string> => {
    return cacheService.cacheImage(url);
  };

  const preloadImages = async (urls: string[]): Promise<void> => {
    return cacheService.preloadImages(urls);
  };

  const clearCache = async (): Promise<void> => {
    return cacheService.clearCache();
  };

  const getCacheStats = () => {
    return cacheService.getCacheStats();
  };

  return {
    getCachedUri,
    cacheImage,
    preloadImages,
    clearCache,
    getCacheStats,
  };
}

// Export singleton instance
export const imageCache = ImageCacheService.getInstance();
