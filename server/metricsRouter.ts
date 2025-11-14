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
