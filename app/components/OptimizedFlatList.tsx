import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, FlatListProps, View, Text, StyleSheet } from 'react-native';

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  estimatedItemSize?: number;
  onEndReachedThreshold?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  updateCellsBatchingPeriod?: number;
  getItemLayout?: (data: T[] | null | undefined, index: number) => { length: number; offset: number; index: number };
  EmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  LoadingComponent?: React.ComponentType<any> | React.ReactElement | null;
  ErrorComponent?: React.ComponentType<{ error: string; onRetry?: () => void }> | React.ReactElement | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Optimized FlatList component with performance enhancements
 */
function OptimizedFlatListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  estimatedItemSize = 60,
  onEndReachedThreshold = 0.5,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  updateCellsBatchingPeriod = 50,
  getItemLayout,
  EmptyComponent,
  LoadingComponent,
  ErrorComponent,
  isLoading = false,
  error = null,
  onRetry,
  ...props
}: OptimizedFlatListProps<T>) {
  
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

  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem({ item, index });
    },
    [renderItem]
  );

  // Memoized key extractor
  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => keyExtractor(item, index),
    [keyExtractor]
  );

  // Default empty component
  const DefaultEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No items found</Text>
    </View>
  ), []);

  // Default loading component
  const DefaultLoadingComponent = useMemo(() => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  ), []);

  // Default error component
  const DefaultErrorComponent = useMemo(() => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      {onRetry && (
        <Text style={styles.retryText} onPress={onRetry}>
          Tap to retry
        </Text>
      )}
    </View>
  ), [error, onRetry]);

  // Show loading state
  if (isLoading && data.length === 0) {
    return LoadingComponent || DefaultLoadingComponent;
  }

  // Show error state
  if (error && data.length === 0) {
    return ErrorComponent || DefaultErrorComponent;
  }

  return (
    <FlatList
      {...props}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      getItemLayout={memoizedGetItemLayout}
      
      // Performance optimizations
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      onEndReachedThreshold={onEndReachedThreshold}
      
      // Memory optimizations
      legacyImplementation={false}
      disableVirtualization={false}
      
      // Empty state
      ListEmptyComponent={EmptyComponent || DefaultEmptyComponent}
      
      // Additional performance props
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
export const OptimizedFlatList = memo(OptimizedFlatListComponent) as <T>(
  props: OptimizedFlatListProps<T>
) => React.ReactElement;

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: '#0066CC',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

/**
 * Hook for optimized FlatList item rendering
 */
export function useOptimizedFlatListItem<T>(
  item: T,
  renderFunction: (item: T) => React.ReactElement
) {
  return useMemo(() => renderFunction(item), [item, renderFunction]);
}

/**
 * Higher-order component for memoizing FlatList items
 */
export function withMemoizedItem<T>(
  Component: React.ComponentType<{ item: T; index: number }>
) {
  return memo(Component, (prevProps, nextProps) => {
    // Custom comparison logic - only re-render if item actually changed
    return (
      prevProps.item === nextProps.item &&
      prevProps.index === nextProps.index
    );
  });
}

/**
 * Utility function to calculate optimal FlatList performance settings
 */
export function calculateOptimalSettings(
  itemCount: number,
  itemHeight: number,
  screenHeight: number
) {
  const itemsPerScreen = Math.ceil(screenHeight / itemHeight);
  
  return {
    initialNumToRender: Math.min(itemsPerScreen + 2, 15),
    maxToRenderPerBatch: Math.max(Math.ceil(itemsPerScreen / 2), 3),
    windowSize: Math.min(Math.ceil(itemCount / itemsPerScreen), 10),
    onEndReachedThreshold: 0.5,
    updateCellsBatchingPeriod: itemCount > 100 ? 100 : 50,
  };
}
