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
      
      // Apply title case capitalization (capitalize first letter of each name part)
      const titleCase = (str: string) => {
        if (!str) return str;
        // Handle hyphenated names: capitalize after hyphens too
        return str.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
      };
      
      // Prevent Excel formula interpretation by prefixing with ' if starts with =, +, @
      // NOTE: Don't prevent hyphens here as they're common in names like "Meng-Ling"
      const preventFormula = (str: string) => {
        if (!str) return str;
        if (/^[=+@]/.test(str)) return `'${str}`;
        return str;
      };
      
      normalizedRow['Full Name'] = preventFormula(nameResult.fullName.split(' ').map(titleCase).join(' '));
      normalizedRow['First Name'] = preventFormula(titleCase(nameResult.firstName));
      normalizedRow['Last Name'] = preventFormula(titleCase(nameResult.lastName));
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
