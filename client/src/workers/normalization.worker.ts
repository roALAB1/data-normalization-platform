/**
 * Web Worker for parallel normalization processing
 * Handles chunks of data in background thread
 */

// Import normalizers directly (will be bundled by Vite)
import { NameEnhanced } from '../lib/NameEnhanced';
import { normalizeValue } from '../lib/normalizeValue';
import { analyzeSchema } from '../lib/schemaAnalyzer';
import { buildPlan } from '../lib/normalizationPlan';
import { processRowWithContext } from '../lib/contextAwareExecutor';

export interface WorkerMessage {
  type: 'process' | 'cancel';
  payload?: {
    chunk: any[];
    strategy: {
      columns: Array<{ name: string; type: string }>;
    };
    chunkIndex: number;
    outputColumns?: string[]; // Columns to include in output
  };
}

export interface WorkerResponse {
  type: 'progress' | 'complete' | 'error';
  payload?: {
    results?: any[];
    chunkIndex?: number;
    processedRows?: number;
    error?: string;
  };
}

// normalizeValue is now imported from ../lib/normalizeValue.ts

/**
 * Process a chunk of rows with context awareness
 */
function processChunk(
  chunk: any[],
  strategy: { columns: Array<{ name: string; type: string }> },
  outputColumns?: string[]
): any[] {
  // Build schema from strategy types (don't re-analyze!)
  const schema = strategy.columns.map(col => ({
    name: col.name,
    type: col.type as any, // Use the type from strategy
    role: 'independent' as const,
  }));
  
  const plan = buildPlan(schema);
  
  return chunk.map((row) => {
    // Use context-aware processing with output column filtering
    return processRowWithContext(row, schema, plan, outputColumns);
  });
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'cancel') {
    // Worker cancellation (close worker from main thread)
    self.close();
    return;
  }

  if (type === 'process' && payload) {
    const { chunk, strategy, chunkIndex, outputColumns } = payload;

    try {
      // Process chunk
      const results = processChunk(chunk, strategy, outputColumns);

      // Send results back to main thread
      const response: WorkerResponse = {
        type: 'complete',
        payload: {
          results,
          chunkIndex,
          processedRows: chunk.length,
        },
      };

      self.postMessage(response);
    } catch (error) {
      // Log detailed error for debugging
      console.error('[Worker] Error processing chunk:', {
        chunkIndex,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        chunk: chunk.slice(0, 2), // Log first 2 rows for context
      });

      // Send error back to main thread
      const response: WorkerResponse = {
        type: 'error',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          chunkIndex,
        },
      };

      self.postMessage(response);
    }
  }
};

// Export empty object for TypeScript
export {};
