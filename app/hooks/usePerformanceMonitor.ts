import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage: number;
  componentMountTime: number;
  totalRenderTime: number;
}

interface PerformanceConfig {
  enableLogging?: boolean;
  sampleRate?: number;
  maxSamples?: number;
}

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceConfig = {}
) {
  const {
    enableLogging = __DEV__,
    sampleRate = 1.0,
    maxSamples = 100,
  } = config;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    componentMountTime: Date.now(),
    totalRenderTime: 0,
  });

  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());

  // Start render timing
  const startRender = useCallback(() => {
    if (Math.random() > sampleRate) return;
    lastRenderStart.current = performance.now();
  }, [sampleRate]);

  // End render timing
  const endRender = useCallback(() => {
    if (lastRenderStart.current === 0) return;
    
    const renderTime = performance.now() - lastRenderStart.current;
    lastRenderStart.current = 0;

    // Store render time
    renderTimes.current.push(renderTime);
    
    // Keep only recent samples
    if (renderTimes.current.length > maxSamples) {
      renderTimes.current = renderTimes.current.slice(-maxSamples);
    }

    // Calculate metrics
    const totalRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0);
    const averageRenderTime = totalRenderTime / renderTimes.current.length;

    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      lastRenderTime: renderTime,
      averageRenderTime,
      totalRenderTime,
    }));

    // Log performance warnings
    if (enableLogging) {
      if (renderTime > 16) { // 60fps threshold
        console.warn(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>16ms)`
        );
      }
      
      if (averageRenderTime > 10) {
        console.warn(
          `[Performance] ${componentName} average render time: ${averageRenderTime.toFixed(2)}ms`
        );
      }
    }
  }, [componentName, enableLogging, maxSamples]);

  // Monitor memory usage (simplified)
  const updateMemoryUsage = useCallback(() => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
      }));
    }
  }, []);

  // Effect to track component lifecycle
  useEffect(() => {
    startRender();
    
    return () => {
      endRender();
    };
  });

  // Periodic memory monitoring
  useEffect(() => {
    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryUsage]);

  // Log component mount time
  useEffect(() => {
    if (enableLogging) {
      const mountDuration = Date.now() - mountTime.current;
      console.log(`[Performance] ${componentName} mounted in ${mountDuration}ms`);
    }
  }, [componentName, enableLogging]);

  // Performance report
  const getPerformanceReport = useCallback(() => {
    const uptime = Date.now() - mountTime.current;
    
    return {
      componentName,
      uptime,
      ...metrics,
      renderFrequency: metrics.renderCount / (uptime / 1000), // renders per second
      memoryUsageMB: metrics.memoryUsage / (1024 * 1024),
    };
  }, [componentName, metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderTimes.current = [];
    setMetrics({
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      componentMountTime: Date.now(),
      totalRenderTime: 0,
    });
    mountTime.current = Date.now();
  }, []);

  return {
    metrics,
    getPerformanceReport,
    resetMetrics,
    startRender,
    endRender,
  };
}

/**
 * Hook for monitoring list performance
 */
export function useListPerformanceMonitor(listName: string, itemCount: number) {
  const [listMetrics, setListMetrics] = useState({
    itemCount: 0,
    renderTime: 0,
    scrollPerformance: 0,
    memoryPerItem: 0,
  });

  const scrollStartTime = useRef<number>(0);
  const lastScrollTime = useRef<number>(0);

  const onScrollBegin = useCallback(() => {
    scrollStartTime.current = performance.now();
  }, []);

  const onScrollEnd = useCallback(() => {
    if (scrollStartTime.current > 0) {
      const scrollTime = performance.now() - scrollStartTime.current;
      lastScrollTime.current = scrollTime;
      
      setListMetrics(prev => ({
        ...prev,
        scrollPerformance: scrollTime,
      }));

      if (scrollTime > 100) {
        console.warn(`[List Performance] ${listName} scroll took ${scrollTime.toFixed(2)}ms`);
      }
    }
  }, [listName]);

  useEffect(() => {
    setListMetrics(prev => ({
      ...prev,
      itemCount,
      memoryPerItem: prev.memoryPerItem || 0,
    }));
  }, [itemCount]);

  const getListReport = useCallback(() => ({
    listName,
    itemCount,
    averageScrollTime: lastScrollTime.current,
    estimatedMemoryUsage: itemCount * 1024, // Rough estimate
    recommendations: {
      shouldVirtualize: itemCount > 100,
      shouldPaginate: itemCount > 1000,
      shouldOptimizeImages: itemCount > 50,
    },
  }), [listName, itemCount]);

  return {
    listMetrics,
    onScrollBegin,
    onScrollEnd,
    getListReport,
  };
}

/**
 * Hook for monitoring network performance
 */
export function useNetworkPerformanceMonitor() {
  const [networkMetrics, setNetworkMetrics] = useState({
    requestCount: 0,
    totalRequestTime: 0,
    averageRequestTime: 0,
    failedRequests: 0,
    cacheHits: 0,
  });

  const requestTimes = useRef<number[]>([]);

  const trackRequest = useCallback(async <T>(
    requestName: string,
    requestFn: () => Promise<T>,
    useCache = false
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await requestFn();
      const requestTime = performance.now() - startTime;
      
      requestTimes.current.push(requestTime);
      
      setNetworkMetrics(prev => ({
        ...prev,
        requestCount: prev.requestCount + 1,
        totalRequestTime: prev.totalRequestTime + requestTime,
        averageRequestTime: (prev.totalRequestTime + requestTime) / (prev.requestCount + 1),
        cacheHits: useCache ? prev.cacheHits + 1 : prev.cacheHits,
      }));

      if (requestTime > 1000) {
        console.warn(`[Network] ${requestName} took ${requestTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      setNetworkMetrics(prev => ({
        ...prev,
        requestCount: prev.requestCount + 1,
        failedRequests: prev.failedRequests + 1,
      }));
      throw error;
    }
  }, []);

  const getNetworkReport = useCallback(() => ({
    ...networkMetrics,
    successRate: ((networkMetrics.requestCount - networkMetrics.failedRequests) / networkMetrics.requestCount) * 100,
    cacheHitRate: (networkMetrics.cacheHits / networkMetrics.requestCount) * 100,
  }), [networkMetrics]);

  return {
    networkMetrics,
    trackRequest,
    getNetworkReport,
  };
}

/**
 * Global performance monitoring
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private components: Map<string, any> = new Map();
  private globalMetrics = {
    totalComponents: 0,
    totalRenders: 0,
    totalMemoryUsage: 0,
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  registerComponent(name: string, metrics: any) {
    this.components.set(name, metrics);
    this.updateGlobalMetrics();
  }

  unregisterComponent(name: string) {
    this.components.delete(name);
    this.updateGlobalMetrics();
  }

  private updateGlobalMetrics() {
    let totalRenders = 0;
    let totalMemoryUsage = 0;

    for (const metrics of this.components.values()) {
      totalRenders += metrics.renderCount || 0;
      totalMemoryUsage += metrics.memoryUsage || 0;
    }

    this.globalMetrics = {
      totalComponents: this.components.size,
      totalRenders,
      totalMemoryUsage,
    };
  }

  getGlobalReport() {
    const componentReports = Array.from(this.components.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
    }));

    return {
      global: this.globalMetrics,
      components: componentReports,
      recommendations: this.generateRecommendations(),
    };
  }

  private generateRecommendations() {
    const recommendations: string[] = [];
    
    if (this.globalMetrics.totalComponents > 50) {
      recommendations.push('Consider component lazy loading for better performance');
    }
    
    if (this.globalMetrics.totalMemoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider optimizing images and data');
    }
    
    return recommendations;
  }
}

export const globalPerformanceMonitor = PerformanceMonitor.getInstance();
