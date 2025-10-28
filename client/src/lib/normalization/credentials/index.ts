/**
 * Credentials Library - Aggregator
 * Combines all credential categories and provides optimized lookup structures
 */

import { ACADEMIC_CREDENTIALS } from './academic';
import { HEALTHCARE_CREDENTIALS } from './healthcare';
import { FINANCE_CREDENTIALS } from './finance';
import { TECHNOLOGY_CREDENTIALS } from './technology';
import { SUPPLYCHAIN_CREDENTIALS } from './supplychain';
import { ENGINEERING_CREDENTIALS } from './engineering';
import { OTHER_CREDENTIALS } from './other';

// Combine all credentials into a single array
export const ALL_CREDENTIALS = [
  ...ACADEMIC_CREDENTIALS,
  ...HEALTHCARE_CREDENTIALS,
  ...FINANCE_CREDENTIALS,
  ...TECHNOLOGY_CREDENTIALS,
  ...SUPPLYCHAIN_CREDENTIALS,
  ...ENGINEERING_CREDENTIALS,
  ...OTHER_CREDENTIALS
] as const;

// Create a Set for O(1) lookup performance
export const CREDENTIALS_SET = new Set(ALL_CREDENTIALS);

// Create a normalized Map for case-insensitive and punctuation-insensitive lookup
export const CREDENTIALS_MAP = new Map<string, string>();
ALL_CREDENTIALS.forEach(cred => {
  // Normalize: remove dots, lowercase
  const normalized = cred.replace(/\./g, '').toLowerCase();
  CREDENTIALS_MAP.set(normalized, cred);
  
  // Also add the original for exact match
  CREDENTIALS_MAP.set(cred, cred);
});

/**
 * Check if a string is a known credential
 * @param value - The string to check
 * @param caseSensitive - Whether to perform case-sensitive matching (default: false)
 * @returns true if the value is a known credential
 */
export function isCredential(value: string, caseSensitive: boolean = false): boolean {
  if (caseSensitive) {
    return CREDENTIALS_SET.has(value as any);
  }
  
  // Normalize and check
  const normalized = value.replace(/\./g, '').toLowerCase();
  return CREDENTIALS_MAP.has(normalized);
}

/**
 * Get the canonical form of a credential
 * @param value - The credential string to normalize
 * @returns The canonical credential string, or null if not found
 */
export function getCanonicalCredential(value: string): string | null {
  // Try exact match first
  if (CREDENTIALS_SET.has(value as any)) {
    return value;
  }
  
  // Try normalized match
  const normalized = value.replace(/\./g, '').toLowerCase();
  return CREDENTIALS_MAP.get(normalized) || null;
}

// Re-export individual categories for selective imports
export {
  ACADEMIC_CREDENTIALS,
  HEALTHCARE_CREDENTIALS,
  FINANCE_CREDENTIALS,
  TECHNOLOGY_CREDENTIALS,
  SUPPLYCHAIN_CREDENTIALS,
  ENGINEERING_CREDENTIALS,
  OTHER_CREDENTIALS
};

// Export types
export type Credential = typeof ALL_CREDENTIALS[number];
