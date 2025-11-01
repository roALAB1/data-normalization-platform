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

    // Collect all name column values first
    const nameColumns = strategy.columns.filter(col => col.type === 'name');
    
    if (nameColumns.length > 0) {
      // Combine all name column values into a single full name for parsing
      const combinedName = nameColumns
        .map(col => row[col.name] || '')
        .filter(val => val.trim())
        .join(' ')
        .trim();
      
      // Parse the combined name once
      const nameResult = normalizeValue('name', combinedName);
      normalizedRow['Full Name'] = nameResult.fullName;
      normalizedRow['First Name'] = nameResult.firstName;
      normalizedRow['Last Name'] = nameResult.lastName;
    }

    // Process non-name columns
    for (const column of strategy.columns) {
      if (column.type !== 'name' && column.type !== 'unknown') {
        normalizedRow[column.name] = normalizeValue(column.type, row[column.name] || '');
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
