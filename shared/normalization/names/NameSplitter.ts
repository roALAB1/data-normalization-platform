/**
 * NameSplitter - Intelligently split full names into first and last names
 * 
 * Handles:
 * - Simple names: "John Smith" → { first: "John", last: "Smith" }
 * - Multiple middle names: "John Michael Smith" → { first: "John", last: "Smith" }
 * - Prefixes/Suffixes: "Dr. John Smith Jr." → { first: "John", last: "Smith" }
 * - Asian names: "Wang Wei" → { first: "Wei", last: "Wang" }
 * - Single names: "Madonna" → { first: "Madonna", last: "" }
 */

import { NameEnhanced } from './index';

export interface SplitNameResult {
  firstName: string;
  lastName: string;
  confidence: number; // 0-1 confidence score
  wasNormalized: boolean; // Whether credentials/prefixes were stripped
}

export class NameSplitter {
  /**
   * Split a full name into first and last names
   */
  split(fullName: string): SplitNameResult {
    if (!fullName || fullName.trim() === '') {
      return {
        firstName: '',
        lastName: '',
        confidence: 0,
        wasNormalized: false,
      };
    }

    // Use NameEnhanced to parse the name
    const parsed = new NameEnhanced(fullName);
    
    if (!parsed.isValid) {
      // Fallback: simple split
      const parts = fullName.trim().split(/\s+/);
      return {
        firstName: parts[0] || '',
        lastName: parts[parts.length - 1] || '',
        confidence: 0.5,
        wasNormalized: false,
      };
    }

    // NameEnhanced already stripped credentials, prefixes, suffixes
    const wasNormalized = parsed.prefix !== '' || parsed.suffix !== '';

    return {
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      confidence: 0.95,
      wasNormalized,
    };
  }
}
