/**
 * Array Parser Utility for CRM Sync Mapper
 * 
 * Handles multi-value arrays in enriched data columns:
 * - Quoted CSV arrays: "+1234, +5678, +9012"
 * - JSON arrays: ["Value 1", "Value 2", "Value 3"]
 * - Single values: "value"
 */

export type ArrayHandlingStrategy = 'first' | 'all' | 'best' | 'deduplicated';

export interface ArrayParseResult {
  values: string[];
  originalFormat: 'quoted-csv' | 'json' | 'single';
  hasDuplicates: boolean;
}

/**
 * Parse a value that may be a single value, quoted CSV array, or JSON array
 */
export function parseArrayValue(value: string | null | undefined): ArrayParseResult {
  if (!value || value.trim() === '') {
    return {
      values: [],
      originalFormat: 'single',
      hasDuplicates: false,
    };
  }

  const trimmed = value.trim();

  // Handle quoted CSV arrays: "+19512309663, +19515755715, +19515324595"
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const unquoted = trimmed.slice(1, -1);
    const values = unquoted.split(',').map(v => v.trim()).filter(v => v !== '');
    const hasDuplicates = values.length !== new Set(values).size;
    
    return {
      values,
      originalFormat: 'quoted-csv',
      hasDuplicates,
    };
  }

  // Handle JSON arrays: ["Value 1", "Value 2", "Value 3"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const values = parsed.map(v => String(v).trim()).filter(v => v !== '');
        const hasDuplicates = values.length !== new Set(values).size;
        
        return {
          values,
          originalFormat: 'json',
          hasDuplicates,
        };
      }
    } catch (error) {
      // If JSON parsing fails, treat as single value
      return {
        values: [trimmed],
        originalFormat: 'single',
        hasDuplicates: false,
      };
    }
  }

  // Single value
  return {
    values: [trimmed],
    originalFormat: 'single',
    hasDuplicates: false,
  };
}

/**
 * Deduplicate array values while preserving order (first occurrence)
 */
export function deduplicateArray(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Apply array handling strategy to parsed array
 */
export function applyArrayStrategy(
  parseResult: ArrayParseResult,
  strategy: ArrayHandlingStrategy
): string {
  const { values } = parseResult;

  if (values.length === 0) {
    return '';
  }

  switch (strategy) {
    case 'first':
      // Return first value
      return values[0];

    case 'all':
      // Return all values comma-separated
      return values.join(', ');

    case 'best':
      // TODO: Implement quality scoring for phones/emails
      // For now, return first value (same as 'first' strategy)
      // Future: Score based on verified status, type (mobile > landline), etc.
      return values[0];

    case 'deduplicated':
      // Remove duplicates and return comma-separated
      const unique = deduplicateArray(values);
      return unique.join(', ');

    default:
      return values[0];
  }
}

/**
 * Normalize phone number for matching (remove all non-digits except leading +)
 */
export function normalizePhoneForMatching(phone: string): string {
  const trimmed = phone.trim();
  
  // Keep leading + if present
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  
  // Remove all non-digits
  return trimmed.replace(/\D/g, '');
}

/**
 * Normalize email for matching (lowercase, trim)
 */
export function normalizeEmailForMatching(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Check if two phone numbers match (handles various formats)
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhoneForMatching(phone1);
  const normalized2 = normalizePhoneForMatching(phone2);
  
  // Direct match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Try matching without country code (last 10 digits for US)
  const digits1 = normalized1.replace(/^\+?1/, ''); // Remove +1 or 1 prefix
  const digits2 = normalized2.replace(/^\+?1/, '');
  
  if (digits1.length === 10 && digits2.length === 10) {
    return digits1 === digits2;
  }
  
  return false;
}

/**
 * Check if two emails match (case-insensitive)
 */
export function emailsMatch(email1: string, email2: string): boolean {
  return normalizeEmailForMatching(email1) === normalizeEmailForMatching(email2);
}

/**
 * Try matching a single value against an array of values
 * Returns the index of the matching value in the array, or -1 if no match
 */
export function findMatchInArray(
  singleValue: string,
  arrayValues: string[],
  columnType: 'phone' | 'email' | 'other'
): number {
  for (let i = 0; i < arrayValues.length; i++) {
    const arrayValue = arrayValues[i];
    
    if (columnType === 'phone') {
      if (phonesMatch(singleValue, arrayValue)) {
        return i;
      }
    } else if (columnType === 'email') {
      if (emailsMatch(singleValue, arrayValue)) {
        return i;
      }
    } else {
      // Generic string match (case-insensitive, trimmed)
      if (singleValue.trim().toLowerCase() === arrayValue.trim().toLowerCase()) {
        return i;
      }
    }
  }
  
  return -1; // No match found
}

/**
 * Get column type for array matching logic
 */
export function getColumnType(columnName: string): 'phone' | 'email' | 'other' {
  const lower = columnName.toLowerCase();
  
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('landline')) {
    return 'phone';
  }
  
  if (lower.includes('email')) {
    return 'email';
  }
  
  return 'other';
}
