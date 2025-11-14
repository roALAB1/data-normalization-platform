// @ts-nocheck
/**
 * Memory Metrics Collector
 * 
 * Collects and stores real-time metrics about worker pool performance:
 * - Active worker count
 * - Worker memory usage (RSS, heap used, heap total)
 * - Worker recycling events
 * - Chunk retry events
 * 
 * Metrics are stored in memory with 1-hour retention window.
 */

export interface WorkerMemoryMetrics {
  timestamp: number;
  workerId: string;
  rss: number; // Resident Set Size in MB
  heapUsed: number; // Heap used in MB
  heapTotal: number; // Heap total in MB
  external: number; // External memory in MB
}

export interface WorkerRecyclingEvent {
  timestamp: number;
  workerId: string;
  reason: 'max_chunks' | 'memory_limit' | 'error' | 'manual';
  chunksProcessed: number;
  memoryUsedMB: number;
}

export interface ChunkRetryEvent {
  timestamp: number;
  chunkId: number;
  attemptNumber: number;
  error: string;
  delayMs: number;
}

export interface SystemMetricsSnapshot {
  timestamp: number;
  activeWorkers: number;
  totalMemoryMB: number;
  avgMemoryPerWorkerMB: number;
  totalChunksProcessed: number;
  totalRetries: number;
  totalRecyclings: number;
}

class MemoryMetricsCollector {
  private static instance: MemoryMetricsCollector;
  
  // Metrics storage with 1-hour retention
  private readonly RETENTION_MS = 60 * 60 * 1000; // 1 hour
  
  private workerMetrics: WorkerMemoryMetrics[] = [];
  private recyclingEvents: WorkerRecyclingEvent[] = [];
  private retryEvents: ChunkRetryEvent[] = [];
  private systemSnapshots: SystemMetricsSnapshot[] = [];
  
  // Current state tracking
  private activeWorkerIds = new Set<string>();
  private chunksProcessedPerWorker = new Map<string, number>();
  
  private constructor() {
    // Start cleanup interval (every 5 minutes)
    setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000);
  }
  
  static getInstance(): MemoryMetricsCollector {
    if (!MemoryMetricsCollector.instance) {
      MemoryMetricsCollector.instance = new MemoryMetricsCollector();
    }
    return MemoryMetricsCollector.instance;
  }
  
  /**
   * Record worker memory usage
   */
  recordWorkerMemory(workerId: string, memoryUsage: NodeJS.MemoryUsage): void {
    const metrics: WorkerMemoryMetrics = {
      timestamp: Date.now(),
      workerId,
      rss: memoryUsage.rss / 1024 / 1024, // Convert to MB
      heapUsed: memoryUsage.heapUsed / 1024 / 1024,
      heapTotal: memoryUsage.heapTotal / 1024 / 1024,
      external: memoryUsage.external / 1024 / 1024,
    };
    
    this.workerMetrics.push(metrics);
    this.activeWorkerIds.add(workerId);
  }
  
  /**
   * Record worker recycling event
   */
  recordRecycling(event: WorkerRecyclingEvent): void {
    this.recyclingEvents.push({
      ...event,
      timestamp: Date.now(),
    });
    
    this.activeWorkerIds.delete(event.workerId);
    this.chunksProcessedPerWorker.delete(event.workerId);
    
    console.log(`[MemoryMetrics] Worker ${event.workerId} recycled: ${event.reason} (${event.chunksProcessed} chunks, ${event.memoryUsedMB.toFixed(2)} MB)`);
  }
  
  /**
   * Record chunk retry event
   */
  recordRetry(event: ChunkRetryEvent): void {
    this.retryEvents.push({
      ...event,
      timestamp: Date.now(),
    });
    
    console.log(`[MemoryMetrics] Chunk ${event.chunkId} retry attempt ${event.attemptNumber}: ${event.error}`);
  }
  
  /**
   * Record chunk processed (for tracking)
   */
  recordChunkProcessed(workerId: string): void {
    const current = this.chunksProcessedPerWorker.get(workerId) || 0;
    this.chunksProcessedPerWorker.set(workerId, current + 1);
  }
  
  /**
   * Take system snapshot
   */
  takeSnapshot(): SystemMetricsSnapshot {
    const recentMetrics = this.getRecentWorkerMetrics(5000); // Last 5 seconds
    const totalMemory = recentMetrics.reduce((sum, m) => sum + m.rss, 0);
    const avgMemory = recentMetrics.length > 0 ? totalMemory / recentMetrics.length : 0;
    
    const snapshot: SystemMetricsSnapshot = {
      timestamp: Date.now(),
      activeWorkers: this.activeWorkerIds.size,
      totalMemoryMB: totalMemory,
      avgMemoryPerWorkerMB: avgMemory,
      totalChunksProcessed: Array.from(this.chunksProcessedPerWorker.values()).reduce((sum, count) => sum + count, 0),
      totalRetries: this.retryEvents.length,
      totalRecyclings: this.recyclingEvents.length,
    };
    
    this.systemSnapshots.push(snapshot);
    return snapshot;
  }
  
  /**
   * Get current metrics snapshot
   */
  getCurrentSnapshot(): SystemMetricsSnapshot {
    return this.takeSnapshot();
  }
  
  /**
   * Get metrics history for time range
   */
  getMetricsHistory(durationMs: number = 60 * 60 * 1000): SystemMetricsSnapshot[] {
    const cutoff = Date.now() - durationMs;
    return this.systemSnapshots.filter(s => s.timestamp >= cutoff);
  }
  
  /**
   * Get recent worker metrics
   */
  getRecentWorkerMetrics(durationMs: number = 5000): WorkerMemoryMetrics[] {
    const cutoff = Date.now() - durationMs;
    return this.workerMetrics.filter(m => m.timestamp >= cutoff);
  }
  
  /**
   * Get recycling events
   */
  getRecyclingEvents(limit: number = 50): WorkerRecyclingEvent[] {
    return this.recyclingEvents.slice(-limit);
  }
  
  /**
   * Get retry events
   */
  getRetryEvents(limit: number = 50): ChunkRetryEvent[] {
    return this.retryEvents.slice(-limit);
  }
  
  /**
   * Get worker memory timeline for specific worker
   */
  getWorkerTimeline(workerId: string, durationMs: number = 60 * 60 * 1000): WorkerMemoryMetrics[] {
    const cutoff = Date.now() - durationMs;
    return this.workerMetrics.filter(m => m.workerId === workerId && m.timestamp >= cutoff);
  }
  
  /**
   * Cleanup old metrics (older than retention window)
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.RETENTION_MS;
    
    const beforeCount = {
      workerMetrics: this.workerMetrics.length,
      recyclingEvents: this.recyclingEvents.length,
      retryEvents: this.retryEvents.length,
      systemSnapshots: this.systemSnapshots.length,
    };
    
    this.workerMetrics = this.workerMetrics.filter(m => m.timestamp >= cutoff);
    this.recyclingEvents = this.recyclingEvents.filter(e => e.timestamp >= cutoff);
    this.retryEvents = this.retryEvents.filter(e => e.timestamp >= cutoff);
    this.systemSnapshots = this.systemSnapshots.filter(s => s.timestamp >= cutoff);
    
    const afterCount = {
      workerMetrics: this.workerMetrics.length,
      recyclingEvents: this.recyclingEvents.length,
      retryEvents: this.retryEvents.length,
      systemSnapshots: this.systemSnapshots.length,
    };
    
    const cleaned = {
      workerMetrics: beforeCount.workerMetrics - afterCount.workerMetrics,
      recyclingEvents: beforeCount.recyclingEvents - afterCount.recyclingEvents,
      retryEvents: beforeCount.retryEvents - afterCount.retryEvents,
      systemSnapshots: beforeCount.systemSnapshots - afterCount.systemSnapshots,
    };
    
    if (cleaned.workerMetrics > 0 || cleaned.recyclingEvents > 0 || cleaned.retryEvents > 0 || cleaned.systemSnapshots > 0) {
      console.log(`[MemoryMetrics] Cleaned up old metrics:`, cleaned);
    }
  }
  
  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.workerMetrics = [];
    this.recyclingEvents = [];
    this.retryEvents = [];
    this.systemSnapshots = [];
    this.activeWorkerIds.clear();
    this.chunksProcessedPerWorker.clear();
    console.log('[MemoryMetrics] All metrics reset');
  }
}

export const metricsCollector = MemoryMetricsCollector.getInstance();
