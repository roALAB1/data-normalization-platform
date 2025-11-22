/**
 * Confidence Scoring System for Address Normalization
 * 
 * Scores each address component (street, city, state, ZIP) on a 0-1 scale
 * based on completeness, format validity, and cross-validation.
 * 
 * Scoring Rules:
 * - Street: Has number (0.3), has suffix (0.3), no abbreviations (0.2), no secondary (0.2)
 * - City: Multi-word (0.1), valid format (0.3), not a state (0.2), proper case (0.2), length 2-30 (0.2)
 * - State: Valid 2-letter code (0.5), matches ZIP (0.3), proper case (0.2)
 * - ZIP: Valid 5-digit format (0.4), matches state (0.3), ZIP+4 format (0.2), not all zeros (0.1)
 * - Overall: Average of all components
 */

import { US_STATES } from './AddressParser';
import { ZIPValidationService } from './ZIPValidationService';

export interface ConfidenceScores {
  street: number;
  city: number;
  state: number;
  zip: number;
  overall: number;
}

export interface AddressFlags {
  missing_street?: boolean;
  missing_city?: boolean;
  missing_state?: boolean;
  missing_zip?: boolean;
  ambiguous_city?: boolean;
  zip_state_mismatch?: boolean;
  invalid_zip?: boolean;
  invalid_state?: boolean;
  short_street?: boolean;
  short_city?: boolean;
}

export class ConfidenceScorer {
  /**
   * Score street address component
   * 
   * Scoring:
   * - Has street number: +0.3
   * - Has street suffix: +0.3
   * - No abbreviations: +0.2
   * - No secondary address: +0.2
   * 
   * @param street - Street address
   * @returns Score 0-1
   */
  static scoreStreet(street: string): number {
    if (!street || street.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const lowerStreet = street.toLowerCase();
    
    // Check for street number (e.g., "123", "456A")
    if (/^\d+/.test(street.trim())) {
      score += 0.3;
    }
    
    // Check for street suffix (St, Ave, Rd, Blvd, Dr, Ln, Ct, etc.)
    const suffixes = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd',
                      'drive', 'dr', 'lane', 'ln', 'court', 'ct', 'circle', 'cir',
                      'place', 'pl', 'way', 'highway', 'hwy', 'parkway', 'pkwy',
                      'trail', 'trl', 'terrace', 'ter', 'plaza', 'plz'];
    
    if (suffixes.some(suffix => lowerStreet.includes(suffix))) {
      score += 0.3;
    }
    
    // Check for no abbreviations (periods indicate abbreviations)
    if (!lowerStreet.includes('.')) {
      score += 0.2;
    }
    
    // Check for no secondary address indicators
    const secondaryIndicators = ['apt', 'apartment', 'ste', 'suite', 'unit', 'u', 'bldg',
                                 'building', 'floor', 'fl', 'flr', 'rm', 'room', 'sp',
                                 'space', 'lot', 'trailer', 'trlr', 'tr', 'no', 'number', '#'];
    
    if (!secondaryIndicators.some(indicator => lowerStreet.includes(indicator))) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score city component
   * 
   * Scoring:
   * - Multi-word city: +0.1
   * - Valid format (2-30 chars, alphanumeric + space/hyphen): +0.3
   * - Not a state name: +0.2
   * - Proper capitalization: +0.2
   * - Length 2-30 characters: +0.2
   * 
   * @param city - City name
   * @returns Score 0-1
   */
  static scoreCity(city: string): number {
    if (!city || city.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const trimmedCity = city.trim();
    const lowerCity = trimmedCity.toLowerCase();
    
    // Check for multi-word city (e.g., "New York", "San Francisco")
    if (trimmedCity.split(/\s+/).length > 1) {
      score += 0.1;
    }
    
    // Check for valid format (alphanumeric, spaces, hyphens, apostrophes)
    if (/^[a-z\s\-']+$/i.test(trimmedCity)) {
      score += 0.3;
    }
    
    // Check that it's not a state name
    const stateValues = Object.values(US_STATES).map(s => s.toLowerCase());
    if (!stateValues.includes(lowerCity)) {
      score += 0.2;
    }
    
    // Check for proper capitalization (first letter uppercase)
    if (/^[A-Z]/.test(trimmedCity)) {
      score += 0.2;
    }
    
    // Check for reasonable length (2-30 characters)
    if (trimmedCity.length >= 2 && trimmedCity.length <= 30) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score state component
   * 
   * Scoring:
   * - Valid 2-letter code: +0.5
   * - Matches ZIP code state: +0.3
   * - Proper uppercase: +0.2
   * 
   * @param state - State abbreviation
   * @param zip - ZIP code (optional, for validation)
   * @returns Score 0-1
   */
  static scoreState(state: string, zip?: string): number {
    if (!state || state.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const upperState = state.toUpperCase().trim();
    
    // Check for valid 2-letter state code
    if (US_STATES[upperState]) {
      score += 0.5;
    }
    
    // Check if state matches ZIP code
    if (zip && ZIPValidationService.validateZIPState(zip, upperState)) {
      score += 0.3;
    }
    
    // Check for proper uppercase
    if (state === upperState) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Score ZIP code component
   * 
   * Scoring:
   * - Valid 5-digit format: +0.4
   * - Matches state: +0.3
   * - ZIP+4 format: +0.2
   * - Not all zeros: +0.1
   * 
   * @param zip - ZIP code
   * @param state - State abbreviation (optional, for validation)
   * @returns Score 0-1
   */
  static scoreZIP(zip: string, state?: string): number {
    if (!zip || zip.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const cleanZip = zip.trim();
    
    // Check for valid 5-digit format
    if (/^\d{5}/.test(cleanZip)) {
      score += 0.4;
    }
    
    // Check if ZIP matches state
    if (state && ZIPValidationService.validateZIPState(cleanZip, state)) {
      score += 0.3;
    }
    
    // Check for ZIP+4 format
    if (/^\d{5}-\d{4}$/.test(cleanZip)) {
      score += 0.2;
    }
    
    // Check that it's not all zeros
    if (!/^0+(-0+)?$/.test(cleanZip)) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate overall confidence score
   * 
   * @param street - Street address
   * @param city - City name
   * @param state - State abbreviation
   * @param zip - ZIP code
   * @returns Overall confidence score (0-1)
   */
  static scoreOverall(street: string, city: string, state: string, zip: string): number {
    const streetScore = this.scoreStreet(street);
    const cityScore = this.scoreCity(city);
    const stateScore = this.scoreState(state, zip);
    const zipScore = this.scoreZIP(zip, state);
    
    // Average of all components
    return (streetScore + cityScore + stateScore + zipScore) / 4;
  }
  
  /**
   * Generate flags for address issues
   * 
   * @param street - Street address
   * @param city - City name
   * @param state - State abbreviation
   * @param zip - ZIP code
   * @returns Array of flag strings
   */
  static generateFlags(street: string, city: string, state: string, zip: string): string[] {
    const flags: string[] = [];
    
    // Missing components
    if (!street || street.trim().length === 0) {
      flags.push('missing_street');
    }
    if (!city || city.trim().length === 0) {
      flags.push('missing_city');
    }
    if (!state || state.trim().length === 0) {
      flags.push('missing_state');
    }
    if (!zip || zip.trim().length === 0) {
      flags.push('missing_zip');
    }
    
    // Short components
    if (street && street.trim().length < 5) {
      flags.push('short_street');
    }
    if (city && city.trim().length < 2) {
      flags.push('short_city');
    }
    
    // Invalid state
    if (state && !US_STATES[state.toUpperCase()]) {
      flags.push('invalid_state');
    }
    
    // Invalid ZIP
    if (zip && !/^\d{5}(-\d{4})?$/.test(zip.trim())) {
      flags.push('invalid_zip');
    }
    
    // ZIP/State mismatch
    if (zip && state && !ZIPValidationService.validateZIPState(zip, state)) {
      flags.push('zip_state_mismatch');
    }
    
    // Ambiguous city (multiple cities with same name in different states)
    // This is a heuristic - cities like "Springfield" exist in many states
    const ambiguousCities = ['springfield', 'madison', 'jackson', 'lincoln', 'columbus',
                             'salem', 'austin', 'denver', 'portland', 'phoenix'];
    if (city && ambiguousCities.includes(city.toLowerCase())) {
      flags.push('ambiguous_city');
    }
    
    return flags;
  }
  
  /**
   * Score address and return comprehensive results
   * 
   * @param street - Street address
   * @param city - City name
   * @param state - State abbreviation
   * @param zip - ZIP code
   * @returns Object with scores and flags
   */
  static scoreAddress(street: string, city: string, state: string, zip: string) {
    return {
      scores: {
        street: this.scoreStreet(street),
        city: this.scoreCity(city),
        state: this.scoreState(state, zip),
        zip: this.scoreZIP(zip, state),
        overall: this.scoreOverall(street, city, state, zip)
      },
      flags: this.generateFlags(street, city, state, zip),
      confidence_level: this.getConfidenceLevel(this.scoreOverall(street, city, state, zip))
    };
  }
  
  /**
   * Get human-readable confidence level
   * 
   * @param score - Confidence score 0-1
   * @returns Confidence level: "high", "medium", or "low"
   */
  static getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.85) return 'high';
    if (score >= 0.70) return 'medium';
    return 'low';
  }
}
