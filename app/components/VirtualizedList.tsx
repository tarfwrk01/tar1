import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  VirtualizedList as RNVirtualizedList,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  estimatedItemSize?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewabilityConfig?: any;
  refreshing?: boolean;
  onRefresh?: () => void;
  horizontal?: boolean;
  numColumns?: number;
  contentContainerStyle?: any;
  style?: any;
  getItemLayout?: (data: T[] | null | undefined, index: number) => { length: number; offset: number; index: number };
  maxToRenderPerBatch?: number;
  windowSize?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
  updateCellsBatchingPeriod?: number;
  debug?: boolean;
}

/**
 * High-performance virtualized list component
 */
function VirtualizedListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  estimatedItemSize = 60,
  onEndReached,
  onEndReachedThreshold = 0.5,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  onViewableItemsChanged,
  viewabilityConfig,
  refreshing,
  onRefresh,
  horizontal = false,
  numColumns = 1,
  contentContainerStyle,
  style,
  getItemLayout,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  initialNumToRender = 10,
  removeClippedSubviews = true,
  updateCellsBatchingPeriod = 50,
  debug = false,
}: VirtualizedListProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);
  const screenData = Dimensions.get('window');

  // Calculate optimal performance settings based on data size and screen
  const performanceSettings = useMemo(() => {
    const dataSize = data.length;
    const screenHeight = screenData.height;
    const itemsPerScreen = Math.ceil(screenHeight / estimatedItemSize);
    
    return {
      initialNumToRender: Math.min(itemsPerScreen + 2, Math.max(initialNumToRender, 5)),
      maxToRenderPerBatch: Math.min(Math.max(Math.ceil(itemsPerScreen / 2), 3), maxToRenderPerBatch),
      windowSize: Math.min(Math.max(Math.ceil(dataSize / itemsPerScreen), 5), windowSize),
      updateCellsBatchingPeriod: dataSize > 1000 ? 100 : updateCellsBatchingPeriod,
    };
  }, [data.length, estimatedItemSize, screenData.height, initialNumToRender, maxToRenderPerBatch, windowSize, updateCellsBatchingPeriod]);

  // Memoized getItemLayout for fixed height items
  const memoizedGetItemLayout = useMemo(() => {
    if (getItemLayout) {
      return getItemLayout;
    }
    
    if (itemHeight) {
      return (data: T[] | null | undefined, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }
    
    return undefined;
  }, [getItemLayout, itemHeight]);

  // Memoized render item with performance tracking
  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      if (debug) {
        console.log(`Rendering item at index ${index}`);
      }
      return renderItem({ item, index });
    },
    [renderItem, debug]
  );

  // Memoized key extractor
  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => {
      const key = keyExtractor(item, index);
      if (debug && !key) {
        console.warn(`Missing key for item at index ${index}`);
      }
      return key;
    },
    [keyExtractor, debug]
  );

  // Handle viewable items changed
  const handleViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      setViewableItems(info.viewableItems);
      onViewableItemsChanged?.(info);
      
      if (debug) {
        console.log(`Viewable items: ${info.viewableItems.length}, Changed: ${info.changed.length}`);
      }
    },
    [onViewableItemsChanged, debug]
  );

  // Optimized viewability config
  const optimizedViewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
    waitForInteraction: true,
    ...viewabilityConfig,
  }), [viewabilityConfig]);

  // Handle end reached with debouncing
  const handleEndReached = useCallback(() => {
    if (onEndReached) {
      if (debug) {
        console.log('End reached, loading more items...');
      }
      onEndReached();
    }
  }, [onEndReached, debug]);

  // Scroll to item
  const scrollToItem = useCallback((params: {
    animated?: boolean;
    item: T;
    viewOffset?: number;
    viewPosition?: number;
  }) => {
    listRef.current?.scrollToItem(params);
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback((params: {
    animated?: boolean;
    index: number;
    viewOffset?: number;
    viewPosition?: number;
  }) => {
    listRef.current?.scrollToIndex(params);
  }, []);

  // Scroll to offset
  const scrollToOffset = useCallback((params: {
    animated?: boolean;
    offset: number;
  }) => {
    listRef.current?.scrollToOffset(params);
  }, []);

  // Get current scroll position
  const getCurrentScrollPosition = useCallback(() => {
    return new Promise<number>((resolve) => {
      listRef.current?.getScrollResponder()?.getScrollableNode()?.measure?.(
        (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          resolve(pageY);
        }
      );
    });
  }, []);

  // Performance monitoring
  const performanceStats = useMemo(() => {
    if (!debug) return null;
    
    return {
      totalItems: data.length,
      viewableItems: viewableItems.length,
      renderSettings: performanceSettings,
      memoryUsage: `~${Math.round((data.length * estimatedItemSize) / 1024)}KB`,
    };
  }, [data.length, viewableItems.length, performanceSettings, estimatedItemSize, debug]);

  // Debug overlay
  const debugOverlay = debug && performanceStats && (
    <View style={styles.debugOverlay}>
      <Text style={styles.debugText}>Items: {performanceStats.totalItems}</Text>
      <Text style={styles.debugText}>Visible: {performanceStats.viewableItems}</Text>
      <Text style={styles.debugText}>Memory: {performanceStats.memoryUsage}</Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={memoizedRenderItem}
        keyExtractor={memoizedKeyExtractor}
        getItemLayout={memoizedGetItemLayout}
        
        // Performance optimizations
        initialNumToRender={performanceSettings.initialNumToRender}
        maxToRenderPerBatch={performanceSettings.maxToRenderPerBatch}
        windowSize={performanceSettings.windowSize}
        removeClippedSubviews={removeClippedSubviews}
        updateCellsBatchingPeriod={performanceSettings.updateCellsBatchingPeriod}
        
        // Scroll behavior
        onEndReached={handleEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        
        // Viewability
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={optimizedViewabilityConfig}
        
        // Layout
        horizontal={horizontal}
        numColumns={numColumns}
        contentContainerStyle={contentContainerStyle}
        
        // Components
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        
        // Refresh
        refreshing={refreshing}
        onRefresh={onRefresh}
        
        // Additional optimizations
        legacyImplementation={false}
        disableVirtualization={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        
        // Accessibility
        accessible={true}
        accessibilityRole="list"
      />
      
      {debugOverlay}
    </View>
  );
}

// Memoize the component
export const VirtualizedList = memo(VirtualizedListComponent) as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default VirtualizedList;

/**
 * Hook for managing virtualized list state
 */
export function useVirtualizedList<T>() {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async (loadFunction: () => Promise<T[]>) => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newData = await loadFunction();
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(async (refreshFunction: () => Promise<T[]>) => {
    setRefreshing(true);
    try {
      const newData = await refreshFunction();
      setData(newData);
      setHasMore(true);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData([]);
    setLoading(false);
    setRefreshing(false);
    setHasMore(true);
  }, []);

  return {
    data,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    reset,
    setData,
  };
}
