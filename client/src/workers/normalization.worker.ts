/**
 * Web Worker for parallel normalization processing
 * Handles chunks of data in background thread
 */

// Import normalizers directly (will be bundled by Vite)
import { NameEnhanced } from '../lib/NameEnhanced';
import { PhoneEnhanced } from '../../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../../shared/normalization/addresses/AddressFormatter';
import { LocationNormalizer } from '../../../shared/normalization/locations';

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
 * For names, returns an object with fullName, firstName, lastName
 */
function normalizeValue(type: string, value: string): any {
  if (!value) return '';

  try {
    switch (type) {
      case 'name': {
        const name = new NameEnhanced(value);
        return name.isValid ? name.full : value;
      }
      case 'first-name': {
        const name = new NameEnhanced(value);
        return name.isValid && name.firstName ? name.firstName : value;
      }
      case 'last-name': {
        const name = new NameEnhanced(value);
        return name.isValid && name.lastName ? name.lastName : value;
      }
      case 'email': {
        const email = new EmailEnhanced(value);
        return email.isValid ? email.normalized : value;
      }
      case 'phone': {
        const phone = PhoneEnhanced.parse(value);
        return phone.isValid ? phone.e164 : value;
      }
      case 'address': {
        const result = AddressFormatter.normalize(value);
        return result.normalized;
      }
      case 'location': {
        return LocationNormalizer.normalize(value);
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
    const normalizedRow: any = {};

    // Process each column based on its type
    for (const column of strategy.columns) {
      const value = row[column.name] || '';
      
      if (column.type === 'name') {
        // Full name column - output as-is
        normalizedRow[column.name] = normalizeValue('name', value);
      } else if (column.type === 'first-name') {
        // First name column - output as-is
        normalizedRow[column.name] = normalizeValue('first-name', value);
      } else if (column.type === 'last-name') {
        // Last name column - output as-is
        normalizedRow[column.name] = normalizeValue('last-name', value);
      } else if (column.type === 'location') {
        // Location - split into City and State columns
        const locationResult = LocationNormalizer.parse(value);
        normalizedRow['City'] = locationResult.city;
        normalizedRow['State'] = locationResult.state;
      } else if (column.type !== 'unknown') {
        // Other types (email, phone, address, etc.)
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
