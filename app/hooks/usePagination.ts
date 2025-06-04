import { useState, useCallback, useMemo } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

/**
 * Custom hook for managing pagination state and actions
 */
export function usePagination(config: PaginationConfig = {}): [PaginationState, PaginationActions] {
  const {
    initialPage = 1,
    pageSize: initialPageSize = 20,
    totalItems: initialTotalItems = 0
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  // Computed values
  const paginationState = useMemo((): PaginationState => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const offset = (currentPage - 1) * pageSize;
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      offset,
      hasNextPage,
      hasPreviousPage
    };
  }, [currentPage, pageSize, totalItems]);

  // Actions
  const setPage = useCallback((page: number) => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalItems, pageSize]);

  const nextPage = useCallback(() => {
    if (paginationState.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [paginationState.hasNextPage]);

  const previousPage = useCallback(() => {
    if (paginationState.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [paginationState.hasPreviousPage]);

  const updatePageSize = useCallback((size: number) => {
    const newSize = Math.max(1, size);
    setPageSize(newSize);
    // Reset to first page when page size changes
    setCurrentPage(1);
  }, []);

  const updateTotalItems = useCallback((total: number) => {
    const newTotal = Math.max(0, total);
    setTotalItems(newTotal);
    
    // Adjust current page if it's beyond the new total pages
    const newTotalPages = Math.ceil(newTotal / pageSize) || 1;
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [currentPage, pageSize]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
    setTotalItems(initialTotalItems);
  }, [initialPage, initialPageSize, initialTotalItems]);

  const actions: PaginationActions = {
    setPage,
    nextPage,
    previousPage,
    setPageSize: updatePageSize,
    setTotalItems: updateTotalItems,
    reset
  };

  return [paginationState, actions];
}

/**
 * Hook for infinite scroll pagination
 */
export function useInfiniteScroll(
  pageSize = 20,
  onLoadMore?: (page: number) => Promise<void>
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const nextPage = currentPage + 1;
      await onLoadMore?.(nextPage);
      
      setCurrentPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, isLoading, hasMore, onLoadMore]);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setIsLoading(false);
    setHasMore(true);
    setError(null);
  }, []);

  const setNoMoreItems = useCallback(() => {
    setHasMore(false);
  }, []);

  return {
    currentPage,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    setNoMoreItems,
    pageSize
  };
}

/**
 * Hook for cursor-based pagination (useful for real-time data)
 */
export function useCursorPagination<T = string>(
  pageSize = 20,
  onLoadMore?: (cursor: T | null, limit: number) => Promise<{ items: any[]; nextCursor: T | null }>
) {
  const [cursor, setCursor] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await onLoadMore?.(cursor, pageSize);
      
      if (result) {
        setItems(prev => [...prev, ...result.items]);
        setCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, onLoadMore, pageSize]);

  const reset = useCallback(() => {
    setCursor(null);
    setIsLoading(false);
    setHasMore(true);
    setError(null);
    setItems([]);
  }, []);

  return {
    items,
    cursor,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    pageSize
  };
}
