// @ts-nocheck
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

import { NameEnhanced } from '../../../client/src/lib/NameEnhanced';

export interface SplitNameResult {
  firstName: string;
  lastName: string;
  confidence: number; // 0-1 confidence score
  wasNormalized: boolean; // Whether credentials/prefixes were stripped
}

export class NameSplitter {
  private nameEnhanced: NameEnhanced;

  constructor() {
    this.nameEnhanced = new NameEnhanced();
  }

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

    // First, normalize the name to strip credentials, prefixes, suffixes
    const normalized = this.nameEnhanced.normalize(fullName);
    const wasNormalized = normalized.normalized !== fullName.trim();

    // Work with the normalized name
    const name = normalized.normalized.trim();

    // Handle single names
    if (!name.includes(' ')) {
      return {
        firstName: name,
        lastName: '',
        confidence: 0.9,
        wasNormalized,
      };
    }

    // Split into parts
    const parts = name.split(/\s+/).filter(p => p.length > 0);

    if (parts.length === 0) {
      return {
        firstName: '',
        lastName: '',
        confidence: 0,
        wasNormalized,
      };
    }

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: '',
        confidence: 0.9,
        wasNormalized,
      };
    }

    // Check if this might be an Asian name (last name first)
    const isAsianOrder = this.detectAsianNameOrder(fullName, normalized);

    if (isAsianOrder) {
      // Asian names: Last name first
      return {
        firstName: parts.slice(1).join(' '),
        lastName: parts[0],
        confidence: 0.85,
        wasNormalized,
      };
    }

    // Western names: First name first, last name last
    // Handle middle names by grouping them with first name or ignoring
    if (parts.length === 2) {
      return {
        firstName: parts[0],
        lastName: parts[1],
        confidence: 0.95,
        wasNormalized,
      };
    }

    // Multiple parts: First name + middle names + last name
    // Strategy: First part is first name, last part is last name
    return {
      firstName: parts[0],
      lastName: parts[parts.length - 1],
      confidence: 0.9,
      wasNormalized,
    };
  }

  /**
   * Detect if a name follows Asian name order (last name first)
   */
  private detectAsianNameOrder(original: string, normalized: any): boolean {
    // Check if the normalized result indicates Asian name order
    if (normalized.metadata?.nameOrder === 'asian') {
      return true;
    }

    // Check for comma-separated format (LAST, First)
    if (original.includes(',')) {
      return true;
    }

    // Additional heuristics could be added here
    // For now, rely on NameEnhanced's detection
    return false;
  }

  /**
   * Batch split multiple full names
   */
  splitBatch(fullNames: string[]): SplitNameResult[] {
    return fullNames.map(name => this.split(name));
  }
}
