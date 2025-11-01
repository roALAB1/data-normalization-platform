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
 * For names, returns an object with fullName, firstName, lastName
 */
function normalizeValue(type: string, value: string): any {
  if (!value) return type === 'name' ? { fullName: '', firstName: '', lastName: '' } : '';

  try {
    switch (type) {
      case 'name': {
        const name = new NameEnhanced(value);
        if (name.isValid) {
          // Use only firstName + lastName for Full Name (no middle name, prefix, suffix, or credentials)
          const cleanFullName = `${name.firstName || ''} ${name.lastName || ''}`.trim();
          return {
            fullName: cleanFullName,
            firstName: name.firstName || '',
            lastName: name.lastName || ''
          };
        }
        return { fullName: value, firstName: '', lastName: '' };
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
    const normalizedRow: any = {};

    // Track if we've already processed a name column
    let nameProcessed = false;

    for (const column of strategy.columns) {
      const value = row[column.name];
      
      if (column.type === 'name' && !nameProcessed) {
        // Process name column - output 3 columns
        const nameResult = normalizeValue('name', value || '');
        normalizedRow['Full Name'] = nameResult.fullName;
        normalizedRow['First Name'] = nameResult.firstName;
        normalizedRow['Last Name'] = nameResult.lastName;
        nameProcessed = true;
      } else if (column.type !== 'name' && column.type !== 'unknown') {
        // Process other column types normally
        normalizedRow[column.name] = normalizeValue(column.type, value || '');
      }
      // Skip name columns after first one and skip unknown columns completely
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
