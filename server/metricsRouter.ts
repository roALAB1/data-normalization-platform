// @ts-nocheck
/**
 * Memory Metrics Router
 * 
 * tRPC endpoints for retrieving worker pool metrics:
 * - getCurrentMetrics: Current system snapshot
 * - getMetricsHistory: Time-series data
 * - getRecyclingEvents: Worker recycling log
 * - getRetryEvents: Chunk retry log
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { metricsCollector } from './services/MemoryMetricsCollector';

export const metricsRouter = router({
  /**
   * Report metrics from client-side workers
   * Bridges client worker metrics to server-side MemoryMetricsCollector
   */
  reportWorkerMetrics: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
        memoryUsage: z.object({
          rss: z.number(),
          heapUsed: z.number(),
          heapTotal: z.number(),
          external: z.number(),
        }),
      })
    )
    .mutation(({ input }) => {
      metricsCollector.recordWorkerMemory(input.workerId, {
        rss: input.memoryUsage.rss,
        heapUsed: input.memoryUsage.heapUsed,
        heapTotal: input.memoryUsage.heapTotal,
        external: input.memoryUsage.external,
        arrayBuffers: 0, // Not tracked in client
      });
      return { success: true };
    }),

  /**
   * Report worker recycling event
   */
  reportRecycling: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
        reason: z.enum(['max_chunks', 'memory_limit', 'error', 'manual']),
        chunksProcessed: z.number(),
        memoryUsedMB: z.number(),
      })
    )
    .mutation(({ input }) => {
      metricsCollector.recordRecycling(input);
      return { success: true };
    }),

  /**
   * Report chunk retry event
   */
  reportRetry: publicProcedure
    .input(
      z.object({
        chunkId: z.number(),
        attemptNumber: z.number(),
        error: z.string(),
        delayMs: z.number(),
      })
    )
    .mutation(({ input }) => {
      metricsCollector.recordRetry(input);
      return { success: true };
    }),

  /**
   * Report chunk processed (for tracking)
   */
  reportChunkProcessed: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
      })
    )
    .mutation(({ input }) => {
      metricsCollector.recordChunkProcessed(input.workerId);
      return { success: true };
    }),

  /**
   * Take system snapshot
   */
  takeSnapshot: publicProcedure.mutation(() => {
    return metricsCollector.takeSnapshot();
  }),

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics: publicProcedure.query(() => {
    return metricsCollector.getCurrentSnapshot();
  }),

  /**
   * Get metrics history for specified time range
   */
  getMetricsHistory: publicProcedure
    .input(
      z.object({
        durationMs: z.number().min(60000).max(3600000).default(3600000), // 1 min to 1 hour
      })
    )
    .query(({ input }) => {
      return metricsCollector.getMetricsHistory(input.durationMs);
    }),

  /**
   * Get recent worker recycling events
   */
  getRecyclingEvents: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(({ input }) => {
      return metricsCollector.getRecyclingEvents(input.limit);
    }),

  /**
   * Get recent chunk retry events
   */
  getRetryEvents: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(({ input }) => {
      return metricsCollector.getRetryEvents(input.limit);
    }),

  /**
   * Get worker memory timeline
   */
  getWorkerTimeline: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
        durationMs: z.number().min(60000).max(3600000).default(3600000),
      })
    )
    .query(({ input }) => {
      return metricsCollector.getWorkerTimeline(input.workerId, input.durationMs);
    }),

  /**
   * Get recent worker metrics (last 5 seconds)
   */
  getRecentWorkerMetrics: publicProcedure.query(() => {
    return metricsCollector.getRecentWorkerMetrics(5000);
  }),
});

export type MetricsRouter = typeof metricsRouter;
