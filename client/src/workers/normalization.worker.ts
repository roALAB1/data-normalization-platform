/**
 * Web Worker for parallel normalization processing
 * Handles chunks of data in background thread
 */

// Import normalizers directly (will be bundled by Vite)
import { NameEnhanced } from '../lib/NameEnhanced';
import { PhoneEnhanced } from '../../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../../shared/normalization/addresses/AddressFormatter';

export interface WorkerMessage {
  type: 'process' | 'cancel';
  payload?: {
    chunk: any[];
    strategy: {
      columns: Array<{ name: string; type: string }>;
    };
    chunkIndex: number;
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

/**
 * Normalize a single value based on type
 */
function normalizeValue(type: string, value: string): string {
  if (!value) return '';

  try {
    switch (type) {
      case 'name': {
        const name = new NameEnhanced(value);
        return name.isValid ? name.format('first-last') : value;
      }
      case 'email': {
        const email = new EmailEnhanced(value);
        return email.isValid ? email.normalized : value;
      }
      case 'phone': {
        const phone = PhoneEnhanced.parse(value);
        return phone.isValid ? phone.digitsOnly : value;
      }
      case 'address': {
        const result = AddressFormatter.normalize(value);
        return result.normalized;
      }
      default:
        return value;
    }
  } catch {
    return value;
  }
}

/**
 * Process a chunk of rows
 */
function processChunk(
  chunk: any[],
  strategy: { columns: Array<{ name: string; type: string }> }
): any[] {
  return chunk.map((row) => {
    const normalizedRow: any = { ...row };

    for (const column of strategy.columns) {
      const value = row[column.name];
      if (value && column.type !== 'unknown') {
        normalizedRow[column.name] = normalizeValue(column.type, value);
      }
    }

    return normalizedRow;
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
    const { chunk, strategy, chunkIndex } = payload;

    try {
      // Process chunk
      const results = processChunk(chunk, strategy);

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
